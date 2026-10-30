// Taxonomia do Codex Aberto.
// Cada área recebe um número de chamada inspirado na CDD (Classificação Decimal de Dewey),
// para que o acervo se pareça com o de uma biblioteca de verdade.
// A classificação é feita pelos títulos das seções das listas de origem (e, como reforço,
// pelo título do livro). A ordem importa: a primeira área cujo padrão casar vence.

export const AREAS = [
  {
    id: 'ia-dados',
    nome: 'Inteligência Artificial & Dados',
    cdd: '006.3',
    descricao: 'IA, aprendizado de máquina, ciência de dados, visão computacional, PLN e engenharia de prompts.',
    padrao: /\b(artificial intelligence|intelig[eê]ncia artificial|inteligencia artificial|k[uü]nstliche intelligenz|intelligence artificielle|machine learning|aprendizado de m[aá]quina|aprendizaje autom[aá]tico|deep learning|aprendizado profundo|neural|redes neurais|data science|ci[eê]ncia de dados|ciencia de datos|data mining|minera[cç][aã]o de dados|big data|hadoop|spark|computer vision|vis[aã]o computacional|natural language|nlp|pln|prompt|information retrieval|recupera[cç][aã]o da informa[cç][aã]o|search engines?|pandas|tensorflow|pytorch|keras|scikit|statistic|estat[ií]stica|estad[ií]stica|llm|ai\b|ia\b)/i,
  },
  {
    id: 'seguranca',
    nome: 'Segurança & Privacidade',
    cdd: '005.8',
    descricao: 'Segurança da informação, criptografia, pentest, engenharia reversa e privacidade.',
    padrao: /\b(security|seguran[cç]a|seguridad|sicherheit|s[ée]curit[ée]|privacy|privacidade|privacidad|crypto(graphy)?|criptografia|criptograf[ií]a|hacking|hacker|pentest|penetration|reverse engineering|engenharia reversa|ingenier[ií]a inversa|malware|forense|forensic|exploit)/i,
  },
  {
    id: 'fronteiras',
    nome: 'Fronteiras: Quântica & Blockchain',
    cdd: '006.9',
    descricao: 'Computação quântica, blockchain, criptoativos e contratos inteligentes.',
    padrao: /\b(quantum|qu[aâ]ntica|cu[aá]ntica|blockchain|bitcoin|ethereum|solidity|smart contract|web3|cripto ?moedas?)/i,
  },
  {
    id: 'bancos-de-dados',
    nome: 'Bancos de Dados',
    cdd: '005.74',
    descricao: 'Modelagem, SQL, NoSQL e sistemas gerenciadores de bancos de dados.',
    padrao: /\b(database|databases|banco de dados|bancos de dados|base de datos|bases de datos|datenbank|base de donn[ée]es|sql|mysql|postgres(ql)?|sqlite|oracle|mongodb|nosql|redis|cassandra|couchdb|neo4j|elasticsearch|mariadb|firebird|dbms)/i,
  },
  {
    id: 'nuvem-devops',
    nome: 'Nuvem, DevOps & Ferramentas',
    cdd: '004.67',
    descricao: 'Computação em nuvem, contêineres, CI/CD, controle de versão e automação.',
    padrao: /\b(cloud|nuvem|nube|containers?|cont[eê]ineres|contenedores|docker|kubernetes|k8s|jenkins|ansible|terraform|puppet|chef|vagrant|devops|ci\/cd|continuous|git|github|gitlab|mercurial|subversion|svn|version control|controle de vers[aã]o|control de versiones|workflow|ide and editors|editores|vim|emacs|neovim|vscode|make|cmake|autotools|maven|gradle|bazel)\b/i,
  },
  {
    id: 'redes',
    nome: 'Redes & Internet',
    cdd: '004.6',
    descricao: 'Protocolos, TCP/IP, redes de computadores, sistemas distribuídos e serviços web.',
    padrao: /\b(network|networking|redes|rede de computadores|netzwerk|r[ée]seaux?|tcp|ip\b|http|protocol|protocolo|distributed|distribu[ií]d|web services|servi[cç]os web|rest\b|graphql|grpc|soa\b|microservi)/i,
  },
  {
    id: 'web-mobile',
    nome: 'Web & Mobile',
    cdd: '006.76',
    descricao: 'Front-end, back-end web, frameworks JavaScript, Android, iOS e desempenho web.',
    padrao: /\b(html|css|sass|less|bootstrap|tailwind|web\b|web development|desenvolvimento web|desarrollo web|frontend|front-end|backend|back-end|angular(js)?|react|redux|vue(\.js)?|svelte|next\.js|nuxt|ember|backbone|jquery|knockout|meteor|node(\.js)?|express(\.js)?|deno|django|flask|fastapi|rails|ruby on rails|laravel|symfony|cakephp|codeigniter|yii|zend|asp\.net|blazor|spring|play framework|phoenix|android|ios\b|swiftui|flutter|react native|ionic|xamarin|mobile|m[oó]vil|pwa|wordpress|drupal|joomla|grunt|gulp|webpack|typescript|javascript|web performance|om\b)/i,
  },
  {
    id: 'jogos-graficos',
    nome: 'Jogos & Computação Gráfica',
    cdd: '794.8',
    descricao: 'Desenvolvimento de jogos, renderização, OpenGL, Vulkan, interfaces gráficas e multimídia.',
    padrao: /\b(game|games|jogos|juegos|spiele|jeux|unity|unreal|godot|pygame|opengl|vulkan|directx|webgl|graphics|gr[aá]fic|ray ?tracing|shader|gui\b|graphical user interface|interfaces? gr[aá]fica|qt\b|gtk|tkinter|wxwidgets|blender|3d\b|anima[cç][aã]o|multimedia|multim[ií]dia)/i,
  },
  {
    id: 'hardware-iot',
    nome: 'Hardware, Embarcados & IoT',
    cdd: '621.39',
    descricao: 'Sistemas embarcados, microcontroladores, Arduino, Raspberry Pi, FPGA e Internet das Coisas.',
    padrao: /\b(embedded|embarcad|embebid|eingebettet|arduino|raspberry|esp32|esp8266|microcontrol|fpga|verilog|vhdl|hardware|iot\b|internet of things|internet das coisas|internet de las cosas|rob[oó]tica|robotics|eletr[oô]nica|electronics|electr[oó]nica|circuit)/i,
  },
  {
    id: 'sistemas',
    nome: 'Sistemas Operacionais & Arquitetura',
    cdd: '004.2',
    descricao: 'Sistemas operacionais, Linux/Unix, arquitetura de computadores, compiladores, programação paralela e de baixo nível.',
    padrao: /\b(operating systems?|sistemas? operac|sistemas? operativ|betriebssystem|syst[eè]mes? d'exploitation|linux|unix|bsd|windows|macos|kernel|shell|bash|zsh|powershell|command line|linha de comando|l[ií]nea de comandos|computer organization|architecture of computers|arquitetura de computadores|arquitectura de computadoras|computer architecture|assembly|assembler|montador|compiler|compilador|compilad|interpreter|parallel|paralel|concurren|concorr[eê]ncia|cuda|opencl|mpi\b|openmp|high performance|alto desempenho|low level|baixo n[ií]vel)/i,
  },
  {
    id: 'engenharia-software',
    nome: 'Engenharia & Arquitetura de Software',
    cdd: '005.1',
    descricao: 'Arquitetura, padrões de projeto, métodos ágeis, testes, carreira, licenças e ecossistema open source.',
    padrao: /\b(software architecture|arquitetura de software|arquitectura de software|software engineering|engenharia de software|ingenier[ií]a de software|softwaretechnik|g[ée]nie logiciel|design patterns?|padr[oõ]es de projeto|patrones de dise[nñ]o|clean code|refactor|refatora|testing|testes|pruebas|tdd|bdd|agile|[aá]gil|scrum|kanban|metodolog|uml|ddd|domain.driven|professional development|desenvolvimento profissional|carreira|career|standards|padr[oõ]es|normas|licensing|licen[cç]|open source ecosystem|c[oó]digo aberto|software livre|software libre|management|ger[eê]ncia|gest[aã]o de projetos|project management|documenta[cç][aã]o|documentation)/i,
  },
  {
    id: 'fundamentos',
    nome: 'Fundamentos & Teoria da Computação',
    cdd: '004.01',
    descricao: 'Algoritmos, estruturas de dados, teoria da computação, matemática e programação competitiva.',
    padrao: /\b(algorithm|algoritm|data structures?|estruturas? de dados|estructuras? de datos|datenstruktur|structures? de donn[ée]es|theoretical computer science|teoria da computa|teor[ií]a de la computa|computer science|ci[eê]ncia da computa[cç][aã]o|ciencias? de la computa|informatik|informatique|mathemat|matem[aá]tic|algebra|[aá]lgebra|calculus|c[aá]lculo|discrete|discreta|logic|l[oó]gica|graph theory|grafos|automat|aut[oô]mat|cellular|partial evaluation|competitive programming|programa[cç][aã]o competitiva|programaci[oó]n competitiva|regular expressions?|express[oõ]es regulares|expresiones regulares|regex|formal|computabil|complexity|complexidade|complejidad|numerical|num[eé]ric|probabil|cryptology)/i,
  },
  {
    id: 'programacao',
    nome: 'Programação & Linguagens',
    cdd: '005.13',
    descricao: 'Linguagens de programação, paradigmas, orientação a objetos e programação em geral.',
    padrao: /.*/, // área padrão
  },
];

// Normaliza o texto de um cabeçalho markdown: remove âncoras, escapes e espaços extras.
export function limparCabecalho(texto) {
  return String(texto)
    .replace(/<a[^>]*>\s*<\/a>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\([#_*\[\]()+.!-])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Escolhe a área de um item a partir dos cabeçalhos (do mais específico ao mais geral) e do título.
export function classificar({ cabecalhos = [], titulo = '' }) {
  const candidatos = [...cabecalhos].reverse(); // subseção primeiro
  for (const texto of candidatos) {
    if (!texto || /^(misc|outros|others|otros|divers|sonstige|agn[oó]sticos?|language agnostic|independientes del lenguaje|programming|programa[cç][aã]o|programaci[oó]n|general|geral)$/i.test(texto)) continue;
    for (const area of AREAS) {
      if (area.id === 'programacao') continue;
      if (area.padrao.test(texto)) return area.id;
    }
  }
  // Reforço: tenta pelo título do livro, mas só para áreas bem específicas
  const especificas = ['ia-dados', 'seguranca', 'fronteiras', 'bancos-de-dados', 'jogos-graficos', 'hardware-iot'];
  for (const area of AREAS) {
    if (especificas.includes(area.id) && area.padrao.test(titulo)) return area.id;
  }
  return 'programacao';
}
