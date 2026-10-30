# Codex Aberto

Biblioteca digital **open source** de tecnologia. Reúne em um só lugar livros, apostilas, artigos científicos, dossiês e teses **gratuitos e legais**, organizados por área e ramificação, para ler online ou baixar.

- **Acervo**: mais de 4.600 livros gratuitos em dezenas de idiomas (incluindo ~190 em português), classificados em 13 áreas com número de chamada inspirado na CDD (Dewey).
- **Hemeroteca**: busca ao vivo em artigos científicos, relatórios técnicos (dossiês), teses, preprints e livros acadêmicos de acesso aberto via [OpenAlex](https://openalex.org).
- **Leitor embutido** para PDFs, botão de download e link para a fonte original.
- **Minha estante**: favoritos salvos no navegador.
- Filtros por área, ramificação, idioma, formato e itens que pedem cadastro. Todo filtro vira URL compartilhável.
- Site 100% estático (HTML, CSS e JavaScript puro). Sem build, sem banco de dados, sem servidor.

## Áreas do acervo

| Chamada | Área |
|---|---|
| 004.01 | Fundamentos & Teoria da Computação |
| 004.2 | Sistemas Operacionais & Arquitetura |
| 004.6 | Redes & Internet |
| 004.67 | Nuvem, DevOps & Ferramentas |
| 005.1 | Engenharia & Arquitetura de Software |
| 005.13 | Programação & Linguagens |
| 005.74 | Bancos de Dados |
| 005.8 | Segurança & Privacidade |
| 006.3 | Inteligência Artificial & Dados |
| 006.76 | Web & Mobile |
| 006.9 | Fronteiras: Quântica & Blockchain |
| 621.39 | Hardware, Embarcados & IoT |
| 794.8 | Jogos & Computação Gráfica |

As regras de classificação ficam em [`scripts/taxonomy.mjs`](scripts/taxonomy.mjs).

## Rodando localmente

Requer Node.js 18 ou superior.

```bash
npm run coletar     # baixa as fontes e gera data/catalog.json, data/areas.json e data/colecoes.json
npm start           # serve o site em http://localhost:3000
```

Abrir o `index.html` direto do disco não funciona, porque o navegador bloqueia a leitura dos arquivos JSON. Use qualquer servidor estático (`npx serve .`, `python3 -m http.server`).

Para importar também livros e relatórios de acesso aberto do OpenAlex para o acervo fixo:

```bash
OPENALEX_MAILTO=seu@email.com npm run coletar:completo
```

## Publicando no GitHub Pages

1. Envie o repositório para o GitHub.
2. Em **Settings → Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`.
3. O workflow [`.github/workflows/atualizar-acervo.yml`](.github/workflows/atualizar-acervo.yml) roda toda segunda-feira, recoleta o acervo e faz commit dos dados atualizados. Ele também pode ser disparado manualmente na aba **Actions**.

Se o repositório for privado, o GitHub Pages exige um plano pago. Netlify, Vercel e Cloudflare Pages servem a pasta como está, sem configuração.

## Estrutura

```
index.html                 página única (acervo, hemeroteca, estante, sobre)
assets/css/style.css       estilos (paleta cereja sobre branco)
assets/js/app.js           lógica do site
assets/js/config.js        configurações (OpenAlex, paginação)
scripts/collect.mjs        coletor do acervo
scripts/taxonomy.mjs       áreas, números de chamada e regras de classificação
scripts/serve.mjs          servidor local sem dependências
data/catalog.json          acervo gerado
data/areas.json            áreas e ramificações com contagens
data/colecoes.json         outras bibliotecas abertas de referência
data/manual.json           obras adicionadas pela comunidade
```

## Fontes e licenças

- Código: licença MIT (veja [LICENSE](LICENSE)).
- Lista de livros: [free-programming-books](https://github.com/EbookFoundation/free-programming-books), da Free Ebook Foundation, sob CC BY 4.0.
- Metadados acadêmicos: [OpenAlex](https://openalex.org), sob CC0.
- O Codex Aberto não hospeda nenhuma obra. Cada ficha aponta para o local onde o autor ou a editora a disponibilizou gratuitamente; os direitos pertencem aos respectivos titulares.

## Como colaborar

Veja [CONTRIBUTING.md](CONTRIBUTING.md).
