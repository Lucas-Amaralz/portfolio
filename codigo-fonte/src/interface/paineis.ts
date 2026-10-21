import './paineis.css';
import { capturarTeclas, el } from './interface';
import { escolherBairro, irParaBairro, pausarCenas } from '../navegacao';
import { CERTIFICACOES, COMPETENCIAS, CONTATOS, FORMACAO, PDF, PERFIL } from '../dados/curriculo';
import EXPERIENCIAS from '../dados/experiencias.json';
import PROJETOS from '../dados/projetos.json';

// Painéis em HTML: telão do Currículo, Contato, Certificações, Expansão Futura, Controles e o menu de entrada.
// Um painel fecha com uma "ação": outro painel ('painel:contato'), um bairro ('bairro:projetos') ou nada.

export type TipoPainel = 'curriculo' | 'contato' | 'certificacoes' | 'expansao' | 'controles';
type Fechar = (acao?: string) => void;

// Ícones simples desenhados à mão (texto fixo do próprio jogo)
const ICONE: Record<string, string> = {
  github: '<svg viewBox="0 0 24 24"><path d="M8 7 3 12l5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-7M12 13c0-2 1.5-3 3-3s2 1 2 3v4"/></svg>',
  email: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  pdf: '<svg viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  copiar: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></svg>',
  guindaste: '<svg viewBox="0 0 48 48"><path d="M10 44V8h4v36M6 44h14M12 8l26 0M14 12l8-4M38 8v14M34 22h8v6h-8zM12 16l26-8"/></svg>',
};

function icone(nome: string) {
  const s = el('span', 'icone');
  s.innerHTML = ICONE[nome];
  return s;
}

function link(texto: string, url: string, classe = 'botao') {
  const a = el('a', classe, texto);
  a.href = url;
  if (!url.startsWith('mailto:')) {
    a.target = '_blank';
    a.rel = 'noopener';
  }
  return a;
}

function botao(texto: string, classe: string, clique: () => void) {
  const b = el('button', classe, texto);
  b.type = 'button';
  b.onclick = clique;
  return b;
}

// Abre um painel com cabeçalho (rótulo, título, ESC) e o corpo que `montar` devolve
function modal(classe: string, rotulo: string, titulo: string, montar: (fechar: Fechar) => HTMLElement[]) {
  return new Promise<string | undefined>((resolver) => {
    const fundo = el('div', 'ui painel-fundo');
    const painel = el('div', `ui painel ${classe}`);
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-modal', 'true');
    painel.setAttribute('aria-label', titulo);
    const topo = el('div', 'painel-topo');
    const cab = el('div');
    cab.append(el('div', 'rotulo', rotulo), el('h1', '', titulo));
    const x = botao('ESC ✕', 'fechar', () => fechar());
    x.setAttribute('aria-label', 'Fechar');
    topo.append(cab, x);
    const corpo = el('div', 'painel-corpo');
    corpo.append(...montar(fechar));
    painel.append(topo, corpo);
    document.body.append(fundo, painel);
    x.focus({ preventScroll: true });

    const soltar = capturarTeclas((ev) => ev.key === 'Escape' && fechar());
    fundo.onclick = () => fechar();
    function fechar(acao?: string) {
      soltar();
      fundo.remove();
      painel.remove();
      resolver(acao);
    }
  });
}

// ---------- Telão do Currículo ----------

function secao(titulo: string, ...filhos: HTMLElement[]) {
  const s = el('section');
  s.append(el('h2', '', titulo), ...filhos);
  return s;
}

function telao(fechar: Fechar) {
  const cabeca = el('div', 'perfil');
  const rosto = el('img', 'rosto');
  rosto.src = 'arte/rosto.png';
  rosto.alt = '';
  const quem = el('div');
  quem.append(el('div', 'nome', PERFIL.nome), el('div', 'cargo', PERFIL.cargo), el('div', 'foco', PERFIL.foco), el('div', 'local', PERFIL.local));
  const acoes = el('div', 'acoes');
  acoes.append(link('Ver currículo completo (PDF)', PDF), botao('Contato', 'botao secundario', () => fechar('painel:contato')));
  cabeca.append(rosto, quem, acoes);

  const esquerda = el('div', 'coluna');
  const resumo = el('div');
  const selos = el('div', 'selos');
  selos.append(...PERFIL.selos.map((s) => el('span', 'selo', s)));
  resumo.append(el('p', 'chamada', PERFIL.chamada), ...PERFIL.resumo.map((t) => el('p', '', t)), selos, el('p', 'objetivo', PERFIL.objetivo));
  const grupos = el('div', 'grupos');
  for (const g of COMPETENCIAS) {
    const d = el('div', 'grupo');
    const chips = el('div', 'chips');
    chips.append(...g.itens.map((i) => el('span', 'chip', i)));
    d.append(el('h3', '', g.area), chips);
    grupos.append(d);
  }
  esquerda.append(secao('Resumo profissional', resumo), secao('Competências técnicas', grupos));

  const direita = el('div', 'coluna');
  const exp = el('div', 'lista');
  for (const e of EXPERIENCIAS) {
    const b = botao('', 'item', () => fechar('bairro:experiencia'));
    b.style.setProperty('--cor', e.cor);
    b.append(el('b', '', e.nome), el('span', '', e.resumo), el('small', '', e.selos[0]));
    exp.append(b);
  }
  const proj = el('div', 'lista');
  for (const p of PROJETOS) {
    const b = botao('', 'item', () => fechar('bairro:projetos'));
    b.style.setProperty('--cor', p.cor);
    b.append(el('b', '', p.nome), el('span', '', `${p.etiqueta} · ${p.area}`));
    proj.append(b);
  }
  const cert = el('ul');
  cert.append(...CERTIFICACOES.map((c) => el('li', '', `${c.nome} – ${c.quem} – ${c.quando}`)));
  const form = el('ul');
  form.append(...FORMACAO.map((f) => el('li', '', [f.nome, f.onde, f.quando].filter(Boolean).join(' – '))));
  direita.append(
    secao('Experiência', exp, el('p', 'dica-item', 'Clique para visitar a Trilha da Carreira')),
    secao('Projetos', proj, el('p', 'dica-item', 'Clique para ir à loja de Projetos')),
    secao('Certificações', cert),
    secao('Formação e idiomas', form),
  );

  const grade = el('div', 'grade');
  grade.append(esquerda, direita);
  return [cabeca, grade];
}

// ---------- Contato ----------

function contato() {
  const lista = el('div', 'contatos');
  const linha = (ic: string, rotulo: string, valor: string, url: string) => {
    const a = link('', url, 'contato');
    const t = el('span', 'texto');
    t.append(el('b', '', rotulo), el('span', '', valor));
    a.append(icone(ic), t);
    return a;
  };
  lista.append(
    linha('github', 'GitHub', CONTATOS.github.texto, CONTATOS.github.url),
    linha('linkedin', 'LinkedIn', CONTATOS.linkedin.texto, CONTATOS.linkedin.url),
    linha('email', 'E-mail', CONTATOS.email, `mailto:${CONTATOS.email}`),
    linha('pdf', 'Currículo (PDF)', 'Baixar ou abrir', PDF),
  );
  const acoes = el('div', 'acoes');
  const enviar = link('Enviar e-mail', `mailto:${CONTATOS.email}`);
  const copiar = botao('Copiar e-mail', 'botao secundario', async () => {
    try {
      await navigator.clipboard.writeText(CONTATOS.email);
      copiar.textContent = 'E-mail copiado';
    } catch {
      copiar.textContent = CONTATOS.email; // sem permissão: mostra para copiar à mão
    }
  });
  copiar.prepend(icone('copiar'));
  acoes.append(enviar, copiar);
  return [lista, acoes];
}

// ---------- Certificações ----------

function certificacoes() {
  const linha = el('ol', 'linha-tempo');
  for (const c of CERTIFICACOES) {
    const li = el('li');
    li.append(el('b', '', c.nome), el('span', '', c.quem), el('small', '', c.quando));
    linha.append(li);
  }
  const form = el('div', 'formacao');
  form.append(el('h2', '', 'Formação e idiomas'));
  const ul = el('ul');
  ul.append(...FORMACAO.map((f) => el('li', '', [f.nome, f.onde, f.quando].filter(Boolean).join(' – '))));
  form.append(ul);
  return [linha, form];
}

// ---------- Expansão Futura ----------

function expansao() {
  const caixa = el('div', 'expansao-caixa');
  caixa.append(icone('guindaste'), el('p', '', 'Novas lojas, projetos e áreas serão adicionadas conforme minha evolução profissional.'));
  return [caixa, el('p', 'rodape-texto', 'A cidade continua crescendo...')];
}

// ---------- Controles ----------

function controles() {
  const t = el('table', 'controles');
  const linhas: [string, string][] = [
    ['WASD ou setas', 'Andar'],
    ['E', 'Falar, abrir portas e totens'],
    ['M', 'Voltar ao mapa'],
    ['ESC', 'Fechar janelas'],
    ['Toque ou clique', 'Andar até o ponto; tocar em alguém ou num prédio vai até ele'],
  ];
  for (const [tecla, o] of linhas) {
    const tr = el('tr');
    const th = el('th');
    th.append(el('kbd', '', tecla));
    tr.append(th, el('td', '', o));
    t.append(tr);
  }
  return [t];
}

const PAINEIS: Record<TipoPainel, [string, string, string, (f: Fechar) => HTMLElement[]]> = {
  curriculo: ['telao', 'TELÃO DO CENTRO', 'Currículo', telao],
  contato: ['contato-painel', 'TORRE DE RÁDIO', 'Entre em contato', contato],
  certificacoes: ['cert-painel', 'FAROL', 'Certificações', certificacoes],
  expansao: ['expansao', 'PRAÇA CENTRAL', 'Expansão futura', expansao],
  controles: ['controles-painel', 'AJUDA', 'Controles', controles],
};

// Abre o painel (e os que ele chamar em seguida). Devolve true se levou o jogador para outro lugar.
export async function abrirPainel(tipo: TipoPainel): Promise<boolean> {
  const retomar = pausarCenas();
  let atual: TipoPainel | null = tipo;
  let acao: string | undefined;
  while (atual) {
    const [classe, rotulo, titulo, montar] = PAINEIS[atual];
    acao = await modal(classe, rotulo, titulo, montar);
    atual = acao?.startsWith('painel:') ? (acao.slice(7) as TipoPainel) : null;
  }
  if (acao?.startsWith('bairro:')) {
    irParaBairro(acao.slice(7));
    return true;
  }
  retomar();
  return false;
}

// ---------- Menu de entrada ----------

const ITENS_MENU: [string, string][] = [
  ['jogar', 'Explorar a cidade'],
  ['curriculo', 'Currículo'],
  ['projetos', 'Projetos'],
  ['experiencia', 'Experiência'],
  ['certificacoes', 'Certificações'],
  ['contato', 'Contato'],
  ['controles', 'Controles'],
];

// Menu de entrada (e do botão Menu): o jogo de baixo fica parado enquanto ele está aberto
export async function menu() {
  const retomar = pausarCenas();
  for (;;) {
    const escolha = await mostrarMenu();
    if (escolha === 'jogar') return retomar();
    if (escolha === 'projetos' || escolha === 'experiencia') {
      retomar();
      return escolherBairro(escolha);
    }
    if (await abrirPainel(escolha as TipoPainel)) return; // foi para outro lugar
  }
}

function mostrarMenu() {
  return new Promise<string>((resolver) => {
    const tela = el('div', 'ui menu');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-label', 'Menu');
    const lado = el('div', 'menu-lado');
    const titulo = el('h1', '', 'The City');
    const lista = el('div', 'menu-lista');
    const botoes = ITENS_MENU.map(([id, texto], i) => {
      const b = botao(texto, 'menu-item', () => escolher(id));
      b.onmouseenter = () => marcar(i);
      lista.append(b);
      return b;
    });
    lado.append(
      titulo,
      el('div', 'menu-sub', 'Portfólio interativo'),
      lista,
      el('p', 'menu-quem', `${PERFIL.nome} · ${PERFIL.cargo}`),
    );
    const lucas = el('div', 'menu-lucas');
    lucas.setAttribute('aria-hidden', 'true');
    lucas.style.backgroundImage = 'url(arte/lucas.png)';
    tela.append(lado, lucas, el('div', 'menu-dica', 'Setas e Enter para escolher'));
    document.body.append(tela);
    document.body.classList.add('com-menu');

    let ativo = 0;
    function marcar(i: number) {
      ativo = (i + botoes.length) % botoes.length;
      botoes.forEach((b, j) => b.classList.toggle('ativa', j === ativo));
    }
    marcar(0);
    botoes[0].focus({ preventScroll: true });

    const soltar = capturarTeclas((ev) => {
      const k = ev.key.toLowerCase();
      if (['arrowup', 'w'].includes(k)) marcar(ativo - 1);
      if (['arrowdown', 's'].includes(k)) marcar(ativo + 1);
      if (['enter', ' ', 'e'].includes(k)) {
        ev.preventDefault();
        escolher(ITENS_MENU[ativo][0]);
      }
      if (k === 'escape') escolher('jogar');
    });
    function escolher(id: string) {
      soltar();
      tela.remove();
      document.body.classList.remove('com-menu');
      resolver(id);
    }
  });
}

// ---------- Botões fixos (Currículo e Contato em qualquer lugar) ----------

export function iniciarBotoesFixos() {
  const hud = el('div', 'hud');
  hud.append(
    botao('Menu', 'hud-botao', () => menu()),
    botao('Currículo', 'hud-botao', () => abrirPainel('curriculo')),
    botao('Contato', 'hud-botao hud-contato', () => abrirPainel('contato')),
  );
  document.body.append(hud);
}
