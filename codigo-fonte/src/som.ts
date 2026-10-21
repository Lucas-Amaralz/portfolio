// Música de fundo: "Chill Lofi Inspired", de omfgdude (OpenGameArt, licença CC0, domínio público),
// em public/musica/. Toca em loop, baixinho, a partir do primeiro toque ou clique (antes disso o
// navegador não deixa tocar). Quem desligar no botão fica com ela desligada nas próximas visitas.

const CHAVE = 'musica-desligada';
const VOLUME = 0.35;

let musica: HTMLAudioElement | null = null;
let rampa = 0;

function desligadaAntes() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

function salvarEscolha(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? '0' : '1');
  } catch {
    // sem armazenamento (aba anônima etc.): vale só até fechar
  }
}

let ligado = !desligadaAntes();

// sobe e desce o volume devagar, sem susto e sem estalo
function aplicar() {
  if (ligado && !musica) {
    musica = new Audio('musica/chill-lofi.mp3');
    musica.loop = true;
    musica.volume = 0;
  }
  if (!musica) return;
  const m = musica;
  if (ligado) m.play().catch(() => {}); // bloqueado: tenta de novo no próximo toque
  clearInterval(rampa);
  const alvo = ligado ? VOLUME : 0;
  rampa = window.setInterval(() => {
    const passo = (alvo - m.volume) * 0.15;
    m.volume = Math.min(1, Math.max(0, Math.abs(passo) < 0.005 ? alvo : m.volume + passo));
    if (m.volume === alvo) {
      clearInterval(rampa);
      if (!ligado) m.pause();
    }
  }, 50);
}

// Botão de som do canto: devolve o elemento para os botões fixos
export function botaoSom(classe: string) {
  const b = document.createElement('button');
  b.className = classe;
  // ícone de alto-falante (com ondas = ligado, com X = desligado): cabe no topo até em celular em pé
  const mostrar = () => {
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/>${
      ligado ? '<path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>' : '<path d="m16 9 5 6M21 9l-5 6"/>'
    }</svg>`;
    b.setAttribute('aria-pressed', String(ligado));
    b.title = ligado ? 'Desligar a música' : 'Ligar a música';
    b.setAttribute('aria-label', b.title);
  };
  b.addEventListener('click', () => {
    ligado = !ligado;
    salvarEscolha(ligado);
    aplicar();
    mostrar();
  });
  // a música começa no primeiro toque, clique ou tecla em qualquer lugar
  if (ligado) {
    const comecar = () => {
      document.removeEventListener('pointerdown', comecar);
      document.removeEventListener('keydown', comecar);
      if (ligado) aplicar();
    };
    document.addEventListener('pointerdown', comecar);
    document.addEventListener('keydown', comecar);
  }
  mostrar();
  return b;
}
