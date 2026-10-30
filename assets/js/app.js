// Codex Aberto — aplicação do navegador (JavaScript puro, sem build).
import { CONFIG } from './config.js';

const $ = (sel, raiz = document) => raiz.querySelector(sel);
const el = (tag, attrs = {}, ...filhos) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const f of filhos.flat()) if (f !== null && f !== undefined && f !== false) n.append(f.nodeType ? f : String(f));
  return n;
};
const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const numero = (n) => n.toLocaleString('pt-BR');

// ---------------------------------------------------------------- Estado
const estado = {
  itens: [],
  areas: [],
  origens: [],
  porArea: new Map(),
  filtro: { q: '', area: '', ramo: '', idioma: '', formatos: [], semCadastro: false, ordem: 'titulo' },
  visiveis: CONFIG.fichasPorPagina,
  resultado: [],
};

// Minha estante (localStorage é só conveniência: tudo funciona sem ele)
const estante = {
  chave: 'codex-aberto:estante',
  ler() { try { return JSON.parse(localStorage.getItem(this.chave)) || {}; } catch { return {}; } },
  gravar(d) { try { localStorage.setItem(this.chave, JSON.stringify(d)); } catch { /* sem armazenamento */ } },
  tem(id) { return id in this.ler(); },
  alternar(item) {
    const d = this.ler();
    if (d[item.id]) delete d[item.id]; else d[item.id] = item;
    this.gravar(d);
    atualizarContador();
    return !!d[item.id];
  },
};

// ---------------------------------------------------------------- Utilidades de catálogo
const areaPorId = (id) => estado.areas.find((a) => a.id === id);
const urlDeArquivo = (url, ext = 'pdf|epub') => new RegExp(`\\.(${ext})($|[?#])`, 'i').test(url);
const podeIncorporar = (url) => url.startsWith('https://') && urlDeArquivo(url, 'pdf');

function cutter(item) {
  const base = (item.autores?.[0] || item.titulo || '').trim();
  const sobrenome = base.includes(',') ? base.split(',')[0] : base.split(/\s+/).filter((p) => p.length > 2).pop() || base;
  const letras = normalizar(sobrenome).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase();
  return letras || normalizar(item.titulo).replace(/[^a-z]/g, '').slice(0, 3).toUpperCase() || '—';
}
const numeroChamada = (item) => `${areaPorId(item.area)?.cdd || '000'} ${cutter(item)}`;

// ---------------------------------------------------------------- Rotas (hash)
function lerRota() {
  const [caminho, busca = ''] = location.hash.replace(/^#\/?/, '').split('?');
  const p = new URLSearchParams(busca);
  return { vista: caminho || 'acervo', p };
}

function escreverFiltroNaUrl() {
  const f = estado.filtro;
  const p = new URLSearchParams();
  if (f.q) p.set('q', f.q);
  if (f.area) p.set('area', f.area);
  if (f.ramo) p.set('ramo', f.ramo);
  if (f.idioma) p.set('idioma', f.idioma);
  if (f.formatos.length) p.set('formato', f.formatos.join(','));
  if (f.semCadastro) p.set('livre', '1');
  if (f.ordem !== 'titulo') p.set('ordem', f.ordem);
  const novo = `#/acervo${p.toString() ? '?' + p : ''}`;
  if (location.hash !== novo) history.replaceState(null, '', novo);
}

function aplicarRota() {
  const { vista, p } = lerRota();
  const valida = ['acervo', 'artigos', 'estante', 'sobre'].includes(vista) ? vista : 'acervo';
  document.querySelectorAll('.vista').forEach((v) => { v.hidden = v.dataset.vista !== valida; });
  document.querySelectorAll('.balcao a').forEach((a) => {
    if (a.dataset.rota === valida) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  if (valida === 'acervo') {
    Object.assign(estado.filtro, {
      q: p.get('q') || '',
      area: p.get('area') || '',
      ramo: p.get('ramo') || '',
      idioma: p.get('idioma') || '',
      formatos: (p.get('formato') || '').split(',').filter(Boolean),
      semCadastro: p.get('livre') === '1',
      ordem: p.get('ordem') || 'titulo',
    });
    $('#busca').value = estado.filtro.q;
    renderizarAcervo(true);
  }
  if (valida === 'estante') renderizarEstante();
  if (valida === 'artigos' && p.get('q')) {
    $('#a-busca').value = p.get('q');
    pesquisarArtigos(true);
  }
}

// ---------------------------------------------------------------- Fichário
function renderizarGaveteiro() {
  const g = $('#gaveteiro');
  g.replaceChildren();
  const gaveta = (id, cdd, nome, total, extra = '') => el('button', {
    class: `gaveta ${extra}`, type: 'button', role: 'listitem', 'data-area': id,
    'aria-pressed': String(estado.filtro.area === id),
    title: id ? areaPorId(id)?.descricao : 'Todo o acervo',
    onclick: () => {
      estado.filtro.area = estado.filtro.area === id ? '' : id;
      estado.filtro.ramo = '';
      escreverFiltroNaUrl();
      renderizarAcervo(true);
      if (matchMedia('(max-width: 860px)').matches) $('.sala').scrollIntoView({ behavior: 'smooth' });
    },
  },
  el('span', { class: 'gaveta__plaqueta' }, el('span', { class: 'gaveta__cdd' }, cdd), el('span', { class: 'gaveta__nome' }, nome)),
  el('span', { class: 'gaveta__puxador', 'aria-hidden': 'true' }),
  el('span', { class: 'gaveta__total' }, `${numero(total)} ${total === 1 ? 'obra' : 'obras'}`));

  g.append(gaveta('', '000–999', 'Todo o acervo', estado.itens.length, 'gaveta--todas'));
  for (const a of estado.areas) if (a.total) g.append(gaveta(a.id, a.cdd, a.nome, a.total));
}

function renderizarRamos() {
  const lista = $('#lista-ramos');
  lista.replaceChildren();
  const area = areaPorId(estado.filtro.area);
  $('#dica-ramo').hidden = !!area;
  if (!area) return;
  // Contagens respeitando idioma/formato/busca, para que o índice reflita o que existe
  const base = filtrar({ ...estado.filtro, ramo: '' });
  const contagem = new Map();
  for (const i of base) contagem.set(i.ramo, (contagem.get(i.ramo) || 0) + 1);
  const ramos = [...contagem.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const botao = (nome, total, valor) => el('li', {}, el('button', {
    type: 'button', 'aria-pressed': String(estado.filtro.ramo === valor),
    onclick: () => { estado.filtro.ramo = estado.filtro.ramo === valor ? '' : valor; escreverFiltroNaUrl(); renderizarAcervo(true); },
  }, el('span', {}, nome), el('span', { class: 'n' }, numero(total))));
  lista.append(botao('Todas as ramificações', base.length, ''));
  for (const [nome, total] of ramos) lista.append(botao(nome, total, nome));
}

function prepararFiltrosFixos() {
  const idiomas = new Map();
  const formatos = new Map();
  for (const i of estado.itens) {
    idiomas.set(i.idioma, (idiomas.get(i.idioma) || 0) + 1);
    for (const f of i.formatos || []) formatos.set(f, (formatos.get(f) || 0) + 1);
  }
  const sel = $('#filtro-idioma');
  const ordenados = [...idiomas.entries()].sort((a, b) => b[1] - a[1]);
  for (const [nome, total] of ordenados) sel.append(el('option', { value: nome }, `${nome} (${numero(total)})`));
  sel.addEventListener('change', () => { estado.filtro.idioma = sel.value; escreverFiltroNaUrl(); renderizarAcervo(true); });

  const chips = $('#filtro-formato');
  for (const [f] of [...formatos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    chips.append(el('button', {
      class: 'chip', type: 'button', 'data-formato': f, 'aria-pressed': 'false',
      onclick: () => {
        const lista = estado.filtro.formatos;
        estado.filtro.formatos = lista.includes(f) ? lista.filter((x) => x !== f) : [...lista, f];
        escreverFiltroNaUrl(); renderizarAcervo(true);
      },
    }, f));
  }
  $('#filtro-cadastro').addEventListener('change', (e) => { estado.filtro.semCadastro = e.target.checked; escreverFiltroNaUrl(); renderizarAcervo(true); });
  $('#ordem').addEventListener('change', (e) => { estado.filtro.ordem = e.target.value; escreverFiltroNaUrl(); renderizarAcervo(true); });
}

// ---------------------------------------------------------------- Filtragem
function filtrar(f) {
  const termos = normalizar(f.q).split(/\s+/).filter(Boolean);
  return estado.itens.filter((i) => {
    if (f.area && i.area !== f.area) return false;
    if (f.ramo && i.ramo !== f.ramo) return false;
    if (f.idioma && i.idioma !== f.idioma) return false;
    if (f.formatos.length && !f.formatos.some((x) => i.formatos?.includes(x))) return false;
    if (f.semCadastro && i.requerCadastro) return false;
    if (termos.length && !termos.every((t) => i._busca.includes(t))) return false;
    return true;
  });
}

function ordenar(lista, ordem) {
  const cmp = (a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
  const copia = [...lista];
  if (ordem === 'autor') copia.sort((a, b) => cmp(a.autores?.[0] || '~', b.autores?.[0] || '~'));
  else if (ordem === 'pdf') copia.sort((a, b) => (urlDeArquivo(b.url, 'pdf') - urlDeArquivo(a.url, 'pdf')) || cmp(a.titulo, b.titulo));
  else if (ordem === 'area') copia.sort((a, b) => cmp(numeroChamada(a), numeroChamada(b)));
  return copia; // 'titulo' já vem ordenado do coletor
}

// ---------------------------------------------------------------- Fichas
function ficha(item, { artigo = false } = {}) {
  const area = areaPorId(item.area);
  const ehPdf = item.formatos?.includes('PDF');
  const arquivoDireto = urlDeArquivo(item.url) || item.pdf;
  const urlLeitura = item.pdf || item.url;

  const dados = el('p', { class: 'ficha__dados' },
    (item.formatos || []).slice(0, 4).map((f) => el('span', { class: `etiqueta ${f === 'PDF' ? 'etiqueta--pdf' : ''}` }, f)),
    el('span', { class: 'etiqueta' }, item.idioma),
    item.ano && el('span', { class: 'etiqueta' }, item.ano),
    item.tipo && item.tipo !== 'livro' && el('span', { class: 'etiqueta' }, rotuloTipo(item.tipo)),
    item.requerCadastro && el('span', { class: 'etiqueta etiqueta--aviso', title: (item.notas || []).join('; ') }, 'Pede cadastro'),
    item.citacoes ? el('span', { class: 'etiqueta' }, `${numero(item.citacoes)} citações`) : null,
  );

  const guardar = el('button', {
    class: 'guardar', type: 'button', 'aria-pressed': String(estante.tem(item.id)),
    'aria-label': `Guardar “${item.titulo}” na minha estante`, title: 'Guardar na minha estante',
    onclick: (e) => {
      const b = e.currentTarget;
      const guardado = estante.alternar(limparParaEstante(item));
      b.setAttribute('aria-pressed', String(guardado));
      if (!guardado && lerRota().vista === 'estante') renderizarEstante();
    },
  });
  guardar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><use href="#marcador"/></svg>';

  const acoes = el('div', { class: 'ficha__acoes' });
  if ((ehPdf || item.pdf) && podeIncorporar(urlLeitura)) {
    acoes.append(el('button', { class: 'botao', type: 'button', onclick: () => abrirLeitor(item) }, 'Ler online'));
  } else {
    acoes.append(el('a', { class: 'botao', href: item.url, target: '_blank', rel: 'noopener' }, ehPdf ? 'Abrir PDF' : 'Ler online'));
  }
  if (arquivoDireto) acoes.append(el('a', { class: 'botao botao--claro', href: urlLeitura, target: '_blank', rel: 'noopener', download: '' }, 'Baixar'));
  if (artigo && item.doi) acoes.append(el('a', { class: 'botao botao--claro', href: item.doi, target: '_blank', rel: 'noopener' }, 'DOI'));

  return el('li', { class: 'ficha' },
    el('div', { class: 'ficha__topo' },
      el('p', { class: 'ficha__chamada' }, `${area?.cdd || '000'} ${cutter(item)}`, el('span', {}, item.ramo || area?.nome || '')),
      guardar),
    el('h3', { class: 'ficha__titulo' }, el('a', { href: item.url, target: '_blank', rel: 'noopener' }, item.titulo)),
    item.autores?.length ? el('p', { class: 'ficha__autor' }, item.autores.join(', ') + (item.tradutor ? `; trad. ${item.tradutor}` : '')) : null,
    item.resumo ? el('p', { class: 'ficha__resumo' }, item.resumo) : null,
    dados,
    acoes,
  );
}

const rotuloTipo = (t) => ({ dossie: 'Dossiê', report: 'Dossiê', article: 'Artigo', dissertation: 'Tese', 'book-chapter': 'Capítulo', book: 'Livro acadêmico', preprint: 'Preprint', review: 'Revisão' }[t] || t);
const limparParaEstante = (i) => { const { _busca, ...resto } = i; return resto; };

function renderizarAcervo(reiniciar = false) {
  if (!estado.itens.length) return;
  if (reiniciar) estado.visiveis = CONFIG.fichasPorPagina;
  const f = estado.filtro;
  estado.resultado = ordenar(filtrar(f), f.ordem);

  document.querySelectorAll('.gaveta').forEach((g) => g.setAttribute('aria-pressed', String(g.dataset.area === f.area)));
  document.querySelectorAll('#filtro-formato .chip').forEach((c) => c.setAttribute('aria-pressed', String(f.formatos.includes(c.dataset.formato))));
  $('#filtro-idioma').value = f.idioma;
  $('#filtro-cadastro').checked = f.semCadastro;
  $('#ordem').value = f.ordem;
  renderizarRamos();
  renderizarFiltrosAtivos();

  const total = estado.resultado.length;
  const area = areaPorId(f.area);
  $('#resultado').replaceChildren(
    el('strong', {}, numero(total)), total === 1 ? ' obra encontrada' : ' obras encontradas',
    area ? ` em ${area.nome}` : ' no acervo',
  );

  const lista = $('#fichas');
  lista.replaceChildren();
  if (!total) {
    lista.append(el('li', { class: 'vazio' }, el('strong', {}, 'Nenhuma ficha com esses critérios'),
      'Tente remover um filtro, buscar por outro termo ou consultar a hemeroteca de artigos.'));
  } else {
    const frag = document.createDocumentFragment();
    for (const i of estado.resultado.slice(0, estado.visiveis)) frag.append(ficha(i));
    lista.append(frag);
  }
  const mais = $('#mais');
  mais.hidden = total <= estado.visiveis;
  mais.textContent = `Mostrar mais fichas (${numero(Math.max(0, total - estado.visiveis))} restantes)`;
}

function renderizarFiltrosAtivos() {
  const f = estado.filtro;
  const caixa = $('#filtros-ativos');
  caixa.replaceChildren();
  const chip = (texto, limpar) => el('button', { type: 'button', 'aria-label': `Remover filtro ${texto}`, onclick: () => { limpar(); escreverFiltroNaUrl(); renderizarAcervo(true); } }, texto);
  if (f.q) caixa.append(chip(`“${f.q}”`, () => { f.q = ''; $('#busca').value = ''; }));
  if (f.area) caixa.append(chip(areaPorId(f.area)?.nome || f.area, () => { f.area = ''; f.ramo = ''; }));
  if (f.ramo) caixa.append(chip(f.ramo, () => { f.ramo = ''; }));
  if (f.idioma) caixa.append(chip(f.idioma, () => { f.idioma = ''; }));
  for (const fmt of f.formatos) caixa.append(chip(fmt, () => { f.formatos = f.formatos.filter((x) => x !== fmt); }));
  if (f.semCadastro) caixa.append(chip('Sem cadastro', () => { f.semCadastro = false; }));
}

function renderizarEstante() {
  const itens = Object.values(estante.ler());
  const lista = $('#fichas-estante');
  lista.replaceChildren();
  if (!itens.length) {
    lista.append(el('li', { class: 'vazio' }, el('strong', {}, 'Sua estante está vazia'),
      'Toque no marcador de qualquer ficha do acervo ou da hemeroteca para guardá-la aqui.'));
    return;
  }
  for (const i of itens) lista.append(ficha(i, { artigo: !!i.doi }));
}

function atualizarContador() {
  const n = Object.keys(estante.ler()).length;
  const c = $('#contador-estante');
  c.hidden = !n;
  c.textContent = n;
}

// ---------------------------------------------------------------- Leitor
const leitor = $('#leitor');
function abrirLeitor(item) {
  const url = item.pdf || item.url;
  $('#leitor-chamada').textContent = [numeroChamada(item), item.ramo].filter(Boolean).join(", ");
  $('#leitor-titulo').textContent = item.titulo;
  $('#leitor-baixar').href = url;
  $('#leitor-origem').href = item.url;
  $('#leitor-quadro').src = url;
  if (typeof leitor.showModal === 'function') leitor.showModal(); else window.open(url, '_blank', 'noopener');
}
function fecharLeitor() { leitor.close(); }
leitor.addEventListener('close', () => { $('#leitor-quadro').src = 'about:blank'; });
$('#leitor-fechar').addEventListener('click', fecharLeitor);
leitor.addEventListener('click', (e) => { if (e.target === leitor) fecharLeitor(); });

// ---------------------------------------------------------------- Hemeroteca (OpenAlex)
const artigos = { pagina: 1, total: 0, carregando: false, semFiltroDeCampo: false };

function reconstruirResumo(indice) {
  if (!indice) return '';
  const palavras = [];
  for (const [p, posicoes] of Object.entries(indice)) for (const pos of posicoes) palavras[pos] = p;
  const texto = palavras.filter(Boolean).join(' ');
  return texto.length > 420 ? texto.slice(0, 420).replace(/\s\S*$/, '') + '…' : texto;
}

function montarUrlOpenAlex() {
  const tipo = $('#a-tipo').value;
  const campo = $('#a-campo').value;
  const idioma = $('#a-idioma').value;
  const filtros = ['open_access.is_oa:true', `type:${tipo}`];
  if (campo && !artigos.semFiltroDeCampo) filtros.push(`primary_topic.field.id:${campo}`);
  if (idioma) filtros.push(`language:${idioma}`);
  const p = new URLSearchParams({
    search: $('#a-busca').value.trim(),
    filter: filtros.join(','),
    sort: $('#a-ordem').value,
    per_page: String(CONFIG.openalex.porPagina),
    page: String(artigos.pagina),
    select: 'id,doi,display_name,publication_year,authorships,best_oa_location,open_access,primary_topic,language,type,cited_by_count,abstract_inverted_index',
  });
  if (CONFIG.openalex.mailto) p.set('mailto', CONFIG.openalex.mailto);
  if (CONFIG.openalex.apiKey) p.set('api_key', CONFIG.openalex.apiKey);
  return `https://api.openalex.org/works?${p}`;
}

function obraParaItem(w) {
  const pdf = w.best_oa_location?.pdf_url || null;
  const sub = w.primary_topic?.subfield?.display_name || w.primary_topic?.field?.display_name || 'Pesquisa';
  const campo = w.primary_topic?.field?.id?.endsWith('/17') ? 'fundamentos' : 'sistemas';
  const idiomas = { pt: 'Português', en: 'Inglês', es: 'Espanhol', fr: 'Francês', de: 'Alemão', zh: 'Chinês' };
  return {
    id: 'oa-' + (w.id || '').split('/').pop(),
    titulo: w.display_name || 'Sem título',
    autores: (w.authorships || []).slice(0, 5).map((a) => a.author?.display_name).filter(Boolean),
    url: w.open_access?.oa_url || w.best_oa_location?.landing_page_url || pdf || w.doi || w.id,
    pdf,
    formatos: pdf ? ['PDF'] : ['HTML'],
    idioma: idiomas[w.language] || (w.language ? w.language.toUpperCase() : '—'),
    ano: w.publication_year,
    area: campo,
    ramo: sub,
    tipo: w.type,
    doi: w.doi,
    citacoes: w.cited_by_count,
    resumo: reconstruirResumo(w.abstract_inverted_index),
  };
}

async function pesquisarArtigos(nova = false) {
  if (artigos.carregando) return;
  const termo = $('#a-busca').value.trim();
  if (!termo) return;
  const lista = $('#a-fichas');
  if (nova) {
    artigos.pagina = 1; artigos.semFiltroDeCampo = false;
    lista.replaceChildren(el('li', { class: 'carregando' }, 'Consultando o OpenAlex…'));
    const novo = `#/artigos?q=${encodeURIComponent(termo)}`;
    if (location.hash !== novo) history.replaceState(null, '', novo);
  }
  artigos.carregando = true;
  $('#a-mais').disabled = true;
  try {
    let resp = await fetch(montarUrlOpenAlex());
    if (resp.status === 400 && !artigos.semFiltroDeCampo) { // filtro de área não aceito: tenta sem ele
      artigos.semFiltroDeCampo = true;
      resp = await fetch(montarUrlOpenAlex());
    }
    if (resp.status === 429) throw new Error('O OpenAlex limitou as consultas por agora. Aguarde um minuto ou configure uma chave de API em assets/js/config.js.');
    if (!resp.ok) throw new Error(`O OpenAlex respondeu com erro ${resp.status}. Tente outro termo.`);
    const dados = await resp.json();
    artigos.total = dados.meta?.count || 0;
    let obras = (dados.results || []).map(obraParaItem);
    if ($('#a-pdf').checked) obras = obras.filter((o) => o.pdf);
    if (nova) lista.replaceChildren();
    for (const o of obras) lista.append(ficha(o, { artigo: true }));
    if (nova && !lista.children.length) {
      lista.append(el('li', { class: 'vazio' }, el('strong', {}, 'Nenhum documento aberto nesta página de resultados'),
        'Desmarque “Só com PDF”, troque o tipo de documento ou use termos em inglês, que têm mais cobertura.'));
    }
    $('#a-resultado').replaceChildren(el('strong', {}, numero(artigos.total)), ' documentos de acesso aberto encontrados',
      artigos.semFiltroDeCampo ? ' (sem filtro de área)' : '');
    $('#a-mais').hidden = artigos.pagina * CONFIG.openalex.porPagina >= artigos.total;
  } catch (e) {
    const msg = e instanceof TypeError ? 'Sem conexão com o OpenAlex. Verifique sua internet e tente de novo.' : e.message;
    if (nova) lista.replaceChildren();
    lista.append(el('li', { class: 'vazio' }, el('strong', {}, 'A consulta não foi concluída'), msg));
  } finally {
    artigos.carregando = false;
    $('#a-mais').disabled = false;
  }
}

$('#form-artigos').addEventListener('submit', (e) => { e.preventDefault(); pesquisarArtigos(true); });
$('#a-mais').addEventListener('click', () => { artigos.pagina++; pesquisarArtigos(false); });

// ---------------------------------------------------------------- Busca do cabeçalho
let temporizador;
$('#busca').addEventListener('input', (e) => {
  if (lerRota().vista !== 'acervo') return;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { estado.filtro.q = e.target.value.trim(); escreverFiltroNaUrl(); renderizarAcervo(true); }, 180);
});
$('#form-busca').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#busca').value.trim();
  if (lerRota().vista === 'artigos') {
    $('#a-busca').value = q;
    pesquisarArtigos(true);
    return;
  }
  estado.filtro.q = q;
  if (lerRota().vista !== 'acervo') location.hash = `#/acervo${q ? '?q=' + encodeURIComponent(q) : ''}`;
  else { escreverFiltroNaUrl(); renderizarAcervo(true); }
  $('.sala').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('#mais').addEventListener('click', () => {
  const inicio = estado.visiveis;
  estado.visiveis += CONFIG.fichasPorPagina;
  const frag = document.createDocumentFragment();
  for (const i of estado.resultado.slice(inicio, estado.visiveis)) frag.append(ficha(i));
  $('#fichas').append(frag);
  const restantes = estado.resultado.length - estado.visiveis;
  $('#mais').hidden = restantes <= 0;
  $('#mais').textContent = `Mostrar mais fichas (${numero(Math.max(0, restantes))} restantes)`;
});

$('#abrir-filtros').addEventListener('click', (e) => {
  const painel = $('#painel-filtros');
  const aberto = painel.classList.toggle('aberto');
  e.currentTarget.setAttribute('aria-expanded', String(aberto));
});

// ---------------------------------------------------------------- Inicialização
async function iniciar() {
  atualizarContador();
  aplicarRota(); // mostra a vista certa enquanto o catálogo carrega
  $('#resultado').textContent = 'Abrindo o catálogo…';
  try {
    const [cat, ar, col] = await Promise.all([
      fetch(CONFIG.catalogo).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(CONFIG.areas).then((r) => r.json()),
      fetch(CONFIG.colecoes).then((r) => (r.ok ? r.json() : [])).catch(() => []),
    ]);
    estado.areas = ar.areas;
    estado.origens = cat.meta.origens || [];
    estado.itens = cat.itens.map((i) => ({
      ...i,
      _busca: normalizar([i.titulo, ...(i.autores || []), i.ramo, i.secao, areaPorId(i.area)?.nome].join(' ')),
    }));

    const data = new Date(cat.meta.geradoEm).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
    $('#resumo-acervo').textContent = `${numero(cat.meta.total)} livros e apostilas gratuitos em ${estado.areas.filter((a) => a.total).length} áreas, mais artigos científicos, dossiês e teses de acesso aberto. Leia no navegador ou baixe.`;
    $('#info-atualizacao').textContent = `Catálogo atualizado em ${data}, com ${numero(cat.meta.total)} obras.`;
    const lc = $('#lista-colecoes');
    for (const c of col) lc.append(el('li', {}, el('a', { href: c.url, target: '_blank', rel: 'noopener' }, c.titulo)));

    renderizarGaveteiro();
    prepararFiltrosFixos();
    aplicarRota();
  } catch (e) {
    $('#resultado').textContent = '';
    $('#fichas').replaceChildren(el('li', { class: 'vazio' }, el('strong', {}, 'O catálogo não foi carregado'),
      'Se você abriu o arquivo direto do disco, sirva a pasta com um servidor local (por exemplo: npx serve .) ou rode npm start. Se o arquivo data/catalog.json não existir, gere-o com npm run coletar.'));
    console.error(e);
  }
}

window.addEventListener('hashchange', aplicarRota);
iniciar();
