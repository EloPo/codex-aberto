// Configurações do Codex Aberto. Ajuste à vontade no seu fork.
export const CONFIG = {
  // Arquivos gerados por `npm run coletar`
  catalogo: 'data/catalog.json',
  areas: 'data/areas.json',
  colecoes: 'data/colecoes.json',

  // OpenAlex: um e-mail de contato coloca suas consultas no "polite pool" (mais estável).
  // Uma chave de API (gratuita em openalex.org) aumenta o limite diário. Ambos são opcionais.
  openalex: {
    mailto: '',
    apiKey: '',
    porPagina: 24,
  },

  // Quantas fichas aparecem por vez no acervo
  fichasPorPagina: 48,
};
