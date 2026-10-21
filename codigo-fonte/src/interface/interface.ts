import './interface.css';

// Interface em HTML por cima do canvas: o texto fica nítido em qualquer zoom.
// Enquanto um diálogo ou cartão está aberto, as teclas não chegam ao Phaser
// (escuta na fase de captura e para a propagação), então o jogo fica parado.

export function capturarTeclas(acao: (ev: KeyboardEvent) => void) {
  const ouvir = (ev: KeyboardEvent) => {
    ev.stopImmediatePropagation();
    acao(ev);
  };
  window.addEventListener('keydown', ouvir, true);
  return () => window.removeEventListener('keydown', ouvir, true);
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texto = '') {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto) e.textContent = texto;
  return e;
}

// ---------- Diálogo ----------

// Mostra a fala com as opções; devolve o índice escolhido (ESC = última opção)
export function dialogo(quem: string, fala: string, opcoes: string[]): Promise<number> {
  return new Promise((resolver) => {
    const caixa = el('div', 'ui dialogo');
    caixa.setAttribute('role', 'dialog');
    caixa.setAttribute('aria-label', quem);
    const p = el('p', 'fala');
    const linha = el('div', 'opcoes');
    caixa.append(el('div', 'quem', quem), p, linha);
    const botoes = opcoes.map((t, i) => {
      const b = el('button', '', t);
      b.type = 'button';
      b.onclick = () => escolher(i);
      b.onmouseenter = () => marcar(i);
      linha.append(b);
      return b;
    });
    document.body.append(caixa);

    // a fala aparece letra por letra; qualquer tecla de confirmar completa de uma vez
    let letras = 0;
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const relogio = setInterval(() => {
      letras = reduzir ? fala.length : letras + 2;
      p.textContent = fala.slice(0, letras);
      if (letras >= fala.length) clearInterval(relogio);
    }, 16);
    const completa = () => letras >= fala.length;

    let ativa = 0;
    function marcar(i: number) {
      ativa = (i + botoes.length) % botoes.length;
      botoes.forEach((b, j) => b.classList.toggle('ativa', j === ativa));
    }
    marcar(0);

    const soltar = capturarTeclas((ev) => {
      const k = ev.key.toLowerCase();
      if (k === 'escape') return escolher(botoes.length - 1);
      if (['e', 'enter', ' '].includes(k)) {
        ev.preventDefault();
        if (!completa()) {
          letras = fala.length;
          p.textContent = fala;
        } else escolher(ativa);
      }
      if (['arrowleft', 'arrowup', 'a', 'w'].includes(k)) marcar(ativa - 1);
      if (['arrowright', 'arrowdown', 'd', 's'].includes(k)) marcar(ativa + 1);
      const n = Number(k);
      if (n >= 1 && n <= botoes.length) escolher(n - 1);
    });

    function escolher(i: number) {
      clearInterval(relogio);
      soltar();
      caixa.remove();
      resolver(i);
    }
  });
}

// ---------- Cartão ----------

export interface Item {
  nome: string;
  cor: string;
  resumo: string;
  selos: string[];
  imagem: string;
  legenda?: string;
  numero?: string;
  destaque?: string;
  secoes: { titulo: string; texto?: string; itens?: string[] }[];
  infra?: string;
  ferramentas: string[];
  links: { texto: string; url: string }[];
}

// Abre o cartão do item `i`; ◀ ▶ (ou setas) passam para os vizinhos.
// Resolve com o índice que estava aberto quando o cartão fechou.
export function cartao(itens: Item[], i: number, onde: string, voltarPara: string): Promise<number> {
  return new Promise((resolver) => {
    const fundo = el('div', 'ui cartao-fundo');
    const painel = el('div', 'ui cartao');
    painel.setAttribute('role', 'dialog');
    painel.setAttribute('aria-modal', 'true');
    document.body.append(fundo, painel);

    function mostrar(n: number) {
      i = n;
      const it = itens[n];
      painel.style.setProperty('--cor', it.cor);
      painel.replaceChildren();
      painel.scrollTop = 0; // Próximo/Anterior: o projeto novo começa do topo, não do ponto em que o outro estava

      const topo = el('div', 'topo');
      const cab = el('div');
      const titulo = el('h1', '', it.nome);
      titulo.id = 'cartao-titulo';
      painel.setAttribute('aria-labelledby', titulo.id);
      const selos = el('div', 'selos');
      selos.append(...it.selos.map((s) => el('span', 'selo', s)));
      cab.append(el('div', 'onde', `${onde} · ${n + 1} DE ${itens.length}`), titulo, el('p', 'resumo', it.resumo), selos);
      const fechar = el('button', 'fechar', 'ESC ✕');
      fechar.type = 'button';
      fechar.setAttribute('aria-label', 'Fechar');
      fechar.onclick = sair;
      topo.append(cab, fechar);

      const corpo = el('div', 'corpo');
      const lado = el('div');
      const fig = el('figure');
      const img = el('img');
      img.src = it.imagem;
      img.classList.toggle('pixel', it.imagem.startsWith('arte/'));
      img.alt = it.legenda ?? it.nome;
      fig.append(img);
      if (it.legenda) fig.append(el('figcaption', '', it.legenda));
      const chips = el('div', 'chips');
      chips.append(...it.ferramentas.map((f) => el('span', 'chip', f)));
      lado.append(fig, chips);

      const texto = el('div');
      // só mostra o destaque quando a fonte traz um resultado com número
      if (it.destaque) {
        const d = el('div', 'destaque');
        if (it.numero) d.append(el('b', '', it.numero));
        d.append(el('p', '', it.destaque));
        texto.append(d);
      }
      for (const s of it.secoes) {
        const sec = el('section');
        sec.append(el('h2', '', s.titulo));
        if (s.texto) sec.append(el('p', '', s.texto));
        if (s.itens) {
          const ul = el('ul');
          ul.append(...s.itens.map((t) => el('li', '', t)));
          sec.append(ul);
        }
        texto.append(sec);
      }
      if (it.infra) {
        const inf = el('div', 'infra');
        inf.append(el('h2', '', 'O que isso mostra para Infra'), el('p', '', it.infra));
        texto.append(inf);
      }
      corpo.append(lado, texto);

      const rodape = el('div', 'rodape');
      // escrito por extenso: só a seta não diz o que faz para quem não joga
      const ant = el('button', 'seta', '‹ Anterior');
      const prox = el('button', 'seta', 'Próximo ›');
      ant.type = prox.type = 'button';
      ant.setAttribute('aria-label', 'Anterior');
      prox.setAttribute('aria-label', 'Próximo');
      ant.disabled = n === 0;
      prox.disabled = n === itens.length - 1;
      ant.onclick = () => mostrar(i - 1);
      prox.onclick = () => mostrar(i + 1);
      rodape.append(ant, prox);
      for (const l of it.links) {
        const a = el('a', 'botao', l.texto);
        a.href = l.url;
        a.target = '_blank';
        a.rel = 'noopener';
        rodape.append(a);
      }
      rodape.append(el('small', '', `ESC ou clique fora para voltar ${voltarPara}`));

      painel.append(topo, corpo, rodape);
      fechar.focus({ preventScroll: true });
    }

    const soltar = capturarTeclas((ev) => {
      if (ev.key === 'Escape') sair();
      if (ev.key === 'ArrowLeft' && i > 0) mostrar(i - 1);
      if (ev.key === 'ArrowRight' && i < itens.length - 1) mostrar(i + 1);
    });
    fundo.onclick = sair;

    function sair() {
      soltar();
      fundo.remove();
      painel.remove();
      resolver(i);
    }
    mostrar(i);
  });
}

// ---------- Dica de controles ----------

let dicaAtual: HTMLElement | null = null;
// `teclado` e `toque` são HTML curto e fixo do próprio jogo (só <b> para as teclas)
export function dica(teclado: string | null, toque = '') {
  dicaAtual?.remove();
  dicaAtual = null;
  if (teclado === null) return;
  const d = el('div', 'ui dica');
  d.innerHTML = `<span class="teclado">${teclado}</span><span class="toque">${toque}</span>`;
  document.body.append(d);
  dicaAtual = d;
}
