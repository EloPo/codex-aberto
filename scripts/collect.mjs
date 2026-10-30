#!/usr/bin/env node
// Coletor do acervo do Codex Aberto.
//
// Reúne livros gratuitos de tecnologia a partir de listas abertas e mantidas pela comunidade
// e gera os arquivos estáticos que o site consome:
//   data/catalog.json   – todos os itens (livros, apostilas, documentos)
//   data/areas.json     – áreas, números de chamada, ramificações e contagens
//   data/colecoes.json  – outras bibliotecas/meta-listas de referência
//
// Uso:
//   node scripts/collect.mjs                 # baixa as fontes do GitHub
//   node scripts/collect.mjs --local <dir>   # usa um clone local do free-programming-books
//   node scripts/collect.mjs --openalex      # também importa livros e relatórios de acesso aberto do OpenAlex
//
// Requer Node.js 18+ (fetch nativo). Sem dependências externas.

import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AREAS, classificar, limparCabecalho } from './taxonomy.mjs';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = path.join(RAIZ, 'data');
const args = process.argv.slice(2);
const opt = (nome) => {
  const i = args.indexOf(nome);
  return i === -1 ? null : args[i + 1] ?? true;
};

// ---------------------------------------------------------------- Fontes
// free-programming-books (EbookFoundation) – CC BY 4.0
const FPB_REPO = 'EbookFoundation/free-programming-books';
const FPB_RAW = `https://raw.githubusercontent.com/${FPB_REPO}/main`;
const FPB_API = `https://api.github.com/repos/${FPB_REPO}/contents/books`;

const IDIOMAS = {
  en: 'Inglês', subjects: 'Inglês', langs: 'Inglês', pt_BR: 'Português (BR)', pt_PT: 'Português (PT)',
  es: 'Espanhol', fr: 'Francês', de: 'Alemão', it: 'Italiano', ru: 'Russo', zh: 'Chinês', ja: 'Japonês',
  ko: 'Coreano', ar: 'Árabe', fa_IR: 'Persa', he: 'Hebraico', hi: 'Hindi', bn: 'Bengali', id: 'Indonésio',
  tr: 'Turco', uk: 'Ucraniano', pl: 'Polonês', cs: 'Tcheco', 'cs-cp': 'Tcheco', nl: 'Holandês', sv: 'Sueco',
  no: 'Norueguês', da: 'Dinamarquês', fi: 'Finlandês', el: 'Grego', hu: 'Húngaro', ro: 'Romeno', bg: 'Búlgaro',
  sr: 'Sérvio', sk: 'Eslovaco', sl: 'Esloveno', vi: 'Vietnamita', th: 'Tailandês', ta: 'Tâmil', te: 'Telugu',
  ml: 'Malaiala', my: 'Birmanês', ur: 'Urdu', uz: 'Uzbeque', az: 'Azerbaijano', hy: 'Armênio', ca: 'Catalão',
  et: 'Estoniano', lv: 'Letão',
};

const FORMATOS = ['PDF', 'EPUB', 'MOBI', 'AZW3', 'HTML', 'Markdown', 'LaTeX', 'ODT', 'DOCX', 'TXT', 'Jupyter', 'Online', 'PostScript'];

// ---------------------------------------------------------------- Utilidades
const idDe = (url) => createHash('sha1').update(url).digest('hex').slice(0, 10);

async function baixar(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'codex-aberto-collector' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
  return r.text();
}

function normalizarFormato(token) {
  const t = token.trim().toLowerCase();
  if (!t) return null;
  if (t.includes('pdf')) return 'PDF';
  if (t.includes('epub')) return 'EPUB';
  if (t.includes('mobi') || t.includes('kindle')) return 'MOBI';
  if (t.includes('azw')) return 'AZW3';
  if (t.includes('html') || t === 'web' || t.includes('gitbook') || t.includes('online') || t.includes('website')) return 'HTML';
  if (t.includes('markdown') || t === 'md') return 'Markdown';
  if (t.includes('latex') || t.includes('tex')) return 'LaTeX';
  if (t.includes('ipynb') || t.includes('jupyter') || t.includes('notebook')) return 'Jupyter';
  if (t.includes('odt')) return 'ODT';
  if (t.includes('docx') || t === 'doc') return 'DOCX';
  if (t.includes('txt') || t.includes('text')) return 'TXT';
  if (t.includes('postscript') || t === 'ps') return 'PostScript';
  return null;
}

// Interpreta a parte depois do link: " - Autor, Outro (PDF, HTML) *(:card: email requerido)*"
function interpretarResto(resto, url) {
  let r = (resto || '').trim();
  const notas = [];
  r = r.replace(/\*\(([^)]*)\)\*/g, (_, n) => { notas.push(n.replace(/:[a-z_]+:/g, '').trim()); return ''; });
  r = r.replace(/^[-–—:]\s*/, '');

  let formatos = [];
  let ano = null;
  // Grupos finais entre parênteses: formatos "(PDF, HTML)" ou observações "(email address requested)"
  for (let m = r.match(/\(([^()]*)\)\s*$/); m; m = r.match(/\(([^()]*)\)\s*$/)) {
    const conteudo = m[1].replace(/\*/g, '').trim();
    const toks = conteudo.split(/[,/|;]| and | e /).map(normalizarFormato).filter(Boolean);
    const pareceFormato = toks.length && conteudo.split(/[,/|;]/).every((p) => normalizarFormato(p) || !p.trim() || p.trim().length < 14);
    if (/^\d{4}$/.test(conteudo)) ano = Number(conteudo);
    else if (pareceFormato) formatos.unshift(...toks);
    else notas.unshift(conteudo);
    r = r.slice(0, m.index).trim();
  }
  if (!formatos.length) {
    if (/\.pdf($|[?#])/i.test(url)) formatos = ['PDF'];
    else if (/\.epub($|[?#])/i.test(url)) formatos = ['EPUB'];
    else formatos = ['HTML'];
  }
  if (/\.pdf($|[?#])/i.test(url) && !formatos.includes('PDF')) formatos.unshift('PDF');

  // Tradutores e marcadores especiais
  let tradutor = null;
  r = r.replace(/,?\s*`(?:trl|trad|tr)\.?:`\s*([^`(]+)/i, (_, t) => { tradutor = t.trim(); return ''; });
  r = r.replace(/`[^`]*`/g, '').replace(/\s*[-–—]\s*$/, '').trim();

  const autores = r
    .replace(/\s+et al\.?/i, ', et al.')
    .split(/\s*,\s*|\s+&\s+|\s+and\s+|\s+e\s+(?=[A-ZÁÉÍÓÚ])/)
    .map((a) => a.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\([^)]*\)?/g, '').replace(/[\[\]()*]/g, '').replace(/\s+/g, ' ').trim())
    .filter((a) => a && a.length < 80 && !/^(pdf|html|e?pub|epub|ebpub|kindle\.*|mobi|git)$/i.test(a) && !/\.pdf|https?:/i.test(a));

  const requerCadastro = notas.some((n) => /email|e-mail|account|conta|regist|cadastro|login|address/i.test(n));
  return { autores: [...new Set(autores)].slice(0, 6), formatos: [...new Set(formatos)], tradutor, notas, requerCadastro, ano };
}

const RE_ITEM = /^\s*[*-]\s+\[(.+?)\]\((https?:\/\/[^\s)]+(?:\([^\s)]*\)[^\s)]*)*)\)(.*)$/;

function interpretarMarkdown(md, { idiomaChave, origem }) {
  const itens = [];
  const colecoes = [];
  let h3 = null;
  let h4 = null;
  let h5 = null;
  let noIndice = false;

  for (const linha of md.split('\n')) {
    const h = linha.match(/^(#{2,5})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const texto = limparCabecalho(h[2]);
      if (nivel <= 3) { h3 = texto; h4 = null; h5 = null; }
      else if (nivel === 4) { h4 = texto; h5 = null; }
      else h5 = texto;
      noIndice = /^(index|índice|indice|inhalt|sommaire|оглавление|目录|目次|contents?)$/i.test(texto);
      continue;
    }
    if (noIndice) continue;
    const m = linha.match(RE_ITEM);
    if (!m) continue;
    const [, tituloBruto, url, resto] = m;
    if (url.includes('#') && url.split('#')[0].endsWith('.md')) continue;

    const titulo = tituloBruto.replace(/\\([\[\]#_*])/g, '$1').replace(/\*\*/g, '').trim();
    if (h3 && /meta-?list|meta lista|metalista/i.test(h3)) {
      colecoes.push({ titulo, url, descricao: (resto || '').replace(/^\s*[-–—]\s*/, '').trim() });
      continue;
    }
    const cabecalhos = [h3, h4, h5].filter(Boolean);
    const extra = interpretarResto(resto, url);
    itens.push({
      id: idDe(url),
      titulo,
      autores: extra.autores,
      tradutor: extra.tradutor,
      ano: extra.ano,
      url,
      formatos: extra.formatos,
      idioma: IDIOMAS[idiomaChave] || idiomaChave,
      area: classificar({ cabecalhos, titulo }),
      ramo: h5 || h4 || h3 || 'Geral',
      secao: h4 ? h3 : null,
      requerCadastro: extra.requerCadastro || undefined,
      notas: extra.notas.length ? extra.notas : undefined,
      fonte: origem,
    });
  }
  return { itens, colecoes };
}

// ---------------------------------------------------------------- Coleta: free-programming-books
async function listarArquivosFPB() {
  const local = opt('--local');
  if (local) {
    const dir = path.resolve(local, 'books');
    return (await readdir(dir)).filter((f) => f.endsWith('.md')).map((f) => ({ nome: f, ler: () => readFile(path.join(dir, f), 'utf8') }));
  }
  let nomes;
  try {
    const lista = JSON.parse(await baixar(FPB_API));
    nomes = lista.filter((f) => f.name.endsWith('.md')).map((f) => f.name);
  } catch (e) {
    console.warn('⚠ API do GitHub indisponível, usando lista fixa de arquivos:', e.message);
    nomes = ['subjects', 'langs', ...Object.keys(IDIOMAS).filter((k) => !['subjects', 'langs', 'en'].includes(k))]
      .map((k) => `free-programming-books-${k}.md`);
  }
  return nomes.map((nome) => ({ nome, ler: () => baixar(`${FPB_RAW}/books/${nome}`) }));
}

async function coletarFPB() {
  const arquivos = await listarArquivosFPB();
  const itens = [];
  const colecoes = [];
  for (const arq of arquivos) {
    const chave = arq.nome.replace(/^free-programming-books-?/, '').replace(/\.md$/, '') || 'en';
    try {
      const md = await arq.ler();
      const r = interpretarMarkdown(md, {
        idiomaChave: chave,
        origem: { nome: 'free-programming-books', url: `https://github.com/${FPB_REPO}/blob/main/books/${arq.nome}`, licenca: 'CC BY 4.0' },
      });
      itens.push(...r.itens);
      colecoes.push(...r.colecoes);
      console.log(`  ✓ ${arq.nome.padEnd(42)} ${String(r.itens.length).padStart(5)} itens`);
    } catch (e) {
      console.warn(`  ✗ ${arq.nome}: ${e.message}`);
    }
  }
  return { itens, colecoes };
}

// ---------------------------------------------------------------- Coleta opcional: OpenAlex
// Livros e relatórios (dossiês) de acesso aberto em Ciência da Computação (field 17) e Engenharia (22).
async function coletarOpenAlex() {
  const chave = process.env.OPENALEX_API_KEY ? `&api_key=${process.env.OPENALEX_API_KEY}` : '';
  const email = process.env.OPENALEX_MAILTO ? `&mailto=${encodeURIComponent(process.env.OPENALEX_MAILTO)}` : '';
  const tipos = [['book', 'livro', 600], ['report', 'dossie', 400]];
  const itens = [];
  for (const [tipoOA, tipo, limite] of tipos) {
    let cursor = '*';
    let total = 0;
    while (cursor && total < limite) {
      const url = 'https://api.openalex.org/works?per_page=200' +
        `&filter=type:${tipoOA},open_access.is_oa:true,primary_topic.field.id:17` +
        '&sort=cited_by_count:desc' +
        '&select=id,display_name,publication_year,authorships,best_oa_location,open_access,primary_topic,language' +
        `&cursor=${encodeURIComponent(cursor)}${chave}${email}`;
      let dados;
      try { dados = JSON.parse(await baixar(url)); } catch (e) { console.warn('  ✗ OpenAlex:', e.message); break; }
      for (const w of dados.results || []) {
        const link = w.best_oa_location?.pdf_url || w.open_access?.oa_url || w.best_oa_location?.landing_page_url;
        if (!link || !w.display_name) continue;
        const sub = w.primary_topic?.subfield?.display_name || 'Computer Science';
        itens.push({
          id: idDe(link),
          titulo: w.display_name,
          autores: (w.authorships || []).slice(0, 6).map((a) => a.author?.display_name).filter(Boolean),
          url: link,
          formatos: w.best_oa_location?.pdf_url ? ['PDF'] : ['HTML'],
          idioma: w.language === 'pt' ? 'Português (BR)' : w.language === 'es' ? 'Espanhol' : 'Inglês',
          ano: w.publication_year,
          area: classificar({ cabecalhos: [sub, w.primary_topic?.display_name], titulo: w.display_name }),
          ramo: sub,
          tipo,
          licenca: w.best_oa_location?.license || undefined,
          fonte: { nome: 'OpenAlex', url: w.id, licenca: 'CC0 (metadados)' },
        });
        total++;
      }
      cursor = dados.meta?.next_cursor;
    }
    console.log(`  ✓ OpenAlex ${tipoOA.padEnd(33)} ${String(total).padStart(5)} itens`);
  }
  return itens;
}

// ---------------------------------------------------------------- Itens enviados pela comunidade
async function lerManuais() {
  const arq = path.join(SAIDA, 'manual.json');
  if (!existsSync(arq)) return [];
  const lista = JSON.parse(await readFile(arq, 'utf8'));
  return lista.map((it) => ({
    id: idDe(it.url),
    autores: [],
    formatos: [/\.pdf($|[?#])/i.test(it.url) ? 'PDF' : 'HTML'],
    idioma: 'Português (BR)',
    tipo: 'livro',
    ramo: 'Geral',
    ...it,
    area: it.area || classificar({ cabecalhos: [it.ramo], titulo: it.titulo }),
    fonte: it.fonte || { nome: 'Comunidade Codex Aberto', url: 'data/manual.json', licenca: it.licenca || '—' },
  }));
}

// ---------------------------------------------------------------- Principal
async function main() {
  console.log('📚 Codex Aberto – coletando acervo\n');
  const fpb = await coletarFPB();
  const manuais = await lerManuais();
  console.log(`  ✓ data/manual.json${' '.repeat(26)}${String(manuais.length).padStart(5)} itens`);
  const oa = args.includes('--openalex') ? await coletarOpenAlex() : [];

  // Remoção de duplicados por URL (itens manuais têm prioridade)
  const porUrl = new Map();
  for (const it of [...manuais, ...fpb.itens, ...oa]) {
    const chave = it.url.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
    if (!porUrl.has(chave)) porUrl.set(chave, it);
  }
  const origens = [];
  const indiceOrigem = new Map();
  for (const it of porUrl.values()) {
    const chave = it.fonte.url;
    if (!indiceOrigem.has(chave)) { indiceOrigem.set(chave, origens.length); origens.push(it.fonte); }
    it.fonte = indiceOrigem.get(chave);
    if (it.tipo === 'livro') delete it.tipo; // 'livro' é o padrão
  }
  const catalogo = [...porUrl.values()]
    .map((it) => Object.fromEntries(Object.entries(it).filter(([, v]) => v !== undefined && v !== null && !(Array.isArray(v) && !v.length))))
    .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base' }));

  // Áreas com ramificações e contagens
  const areas = AREAS.map(({ id, nome, cdd, descricao }) => {
    const doArea = catalogo.filter((i) => i.area === id);
    const tipos = {};
    for (const i of doArea) tipos[i.tipo || 'livro'] = (tipos[i.tipo || 'livro'] || 0) + 1;
    const ramos = {};
    for (const i of doArea) ramos[i.ramo] = (ramos[i.ramo] || 0) + 1;
    return {
      id, nome, cdd, descricao, total: doArea.length, tipos,
      ramos: Object.entries(ramos).sort((a, b) => b[1] - a[1]).map(([nome, total]) => ({ nome, total })),
    };
  });

  const colecoes = [...new Map(fpb.colecoes.map((c) => [c.url, c])).values()];
  const meta = {
    geradoEm: new Date().toISOString(),
    total: catalogo.length,
    origens,
    fontes: [
      { nome: 'free-programming-books (EbookFoundation)', url: `https://github.com/${FPB_REPO}`, licenca: 'CC BY 4.0' },
      ...(oa.length ? [{ nome: 'OpenAlex', url: 'https://openalex.org', licenca: 'CC0' }] : []),
    ],
  };

  await mkdir(SAIDA, { recursive: true });
  await writeFile(path.join(SAIDA, 'catalog.json'), JSON.stringify({ meta, itens: catalogo }));
  await writeFile(path.join(SAIDA, 'areas.json'), JSON.stringify({ meta: { ...meta, origens: undefined }, areas }, null, 2));
  await writeFile(path.join(SAIDA, 'colecoes.json'), JSON.stringify(colecoes, null, 2));

  console.log(`\n📖 ${catalogo.length} itens catalogados em ${areas.filter((a) => a.total).length} áreas.`);
  for (const a of areas) console.log(`   ${a.cdd.padEnd(7)} ${a.nome.padEnd(40)} ${a.total}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
