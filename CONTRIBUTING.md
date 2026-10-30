# Como colaborar com o Codex Aberto

Obrigado por ajudar a manter a biblioteca. Há três formas principais de contribuir.

## 1. Sugerir uma obra

Adicione um objeto em [`data/manual.json`](data/manual.json) e abra um pull request:

```json
[
  {
    "titulo": "Think Python, 2ª edição",
    "autores": ["Allen B. Downey"],
    "url": "https://greenteapress.com/thinkpython2/thinkpython2.pdf",
    "formatos": ["PDF"],
    "idioma": "Inglês",
    "area": "programacao",
    "ramo": "Python",
    "licenca": "CC BY-NC 3.0"
  }
]
```

Campos:

| Campo | Obrigatório | Descrição |
|---|---|---|
| `titulo` | sim | Título da obra |
| `url` | sim | Link para o arquivo ou a página oficial de leitura |
| `autores` | não | Lista de autores |
| `formatos` | não | `PDF`, `EPUB`, `HTML`, `MOBI`, `Markdown`… (detectado pela URL se omitido) |
| `idioma` | não | Ex.: `Português (BR)` (padrão), `Inglês`, `Espanhol` |
| `area` | não | Um id de [`scripts/taxonomy.mjs`](scripts/taxonomy.mjs); se omitido, é inferido pelo `ramo` e pelo título |
| `ramo` | não | Ramificação dentro da área, ex.: `Kubernetes`, `Redes neurais` |
| `tipo` | não | `livro` (padrão), `dossie`, `article`, `dissertation` |
| `ano`, `licenca` | não | Ano de publicação e licença da obra |

**Critério de aceite:** a obra precisa ser distribuída gratuitamente e de forma legal por quem detém os direitos (autor, editora, universidade, órgão público). Links para cópias não autorizadas serão recusados.

Livros que servem a toda a comunidade também podem ser enviados diretamente para a [free-programming-books](https://github.com/EbookFoundation/free-programming-books), de onde o Codex Aberto importa automaticamente.

## 2. Melhorar a classificação

As áreas, os números de chamada e as regras de classificação estão em `scripts/taxonomy.mjs`. Depois de mudar uma regra, rode `npm run coletar` e confira o resumo que o coletor imprime no terminal.

## 3. Código e design

- O site é JavaScript puro, sem framework e sem etapa de build. Mantenha assim.
- Teste em celular e desktop, com teclado e com leitor de tela quando possível.
- Textos da interface em português do Brasil, em frases curtas e com a voz ativa.

## Reportar problemas

Link quebrado, obra mal classificada ou bug? Abra uma issue informando o título, a URL e o que aconteceu.
