// Som ambiente de chuva, gerado na hora (ruído filtrado), sem arquivo de áudio.
// Começa desligado: o navegador só deixa tocar depois de um clique, e recrutador abrindo
// o link no trabalho não quer ser pego de surpresa. A escolha fica salva neste navegador.

const CHAVE = 'som-ligado';
let contexto: AudioContext | null = null;
let volume: GainNode | null = null;

function montar() {
  contexto = new AudioContext();
  // 2 s de ruído branco em loop
  const quadros = contexto.sampleRate * 2;
  const buffer = contexto.createBuffer(1, quadros, contexto.sampleRate);
  const dados = buffer.getChannelData(0);
  for (let i = 0; i < quadros; i++) dados[i] = Math.random() * 2 - 1;
  const fonte = contexto.createBufferSource();
  fonte.buffer = buffer;
  fonte.loop = true;
  // passa-faixa tira o chiado agudo e o grave: sobra o "shhh" de chuva caindo
  const filtro = contexto.createBiquadFilter();
  filtro.type = 'bandpass';
  filtro.frequency.value = 1200;
  filtro.Q.value = 0.6;
  volume = contexto.createGain();
  volume.gain.value = 0;
  fonte.connect(filtro).connect(volume).connect(contexto.destination);
  fonte.start();
}

function lerEscolha() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

function salvarEscolha(ligado: boolean) {
  try {
    localStorage.setItem(CHAVE, ligado ? '1' : '0');
  } catch {
    // sem armazenamento (aba anônima etc.): vale só até fechar
  }
}

let ligado = false;

function aplicar() {
  if (ligado && !contexto) montar();
  if (!contexto || !volume) return;
  if (ligado) contexto.resume();
  // sobe e desce devagar, sem estalo
  volume.gain.setTargetAtTime(ligado ? 0.08 : 0, contexto.currentTime, 0.4);
}

// Botão "Som" do canto: devolve o elemento para os botões fixos
export function botaoSom(classe: string) {
  const b = document.createElement('button');
  b.className = classe;
  const mostrar = () => {
    b.textContent = ligado ? 'Som: on' : 'Som: off';
    b.setAttribute('aria-pressed', String(ligado));
    b.title = ligado ? 'Desligar o som da chuva' : 'Ligar o som da chuva';
  };
  b.addEventListener('click', () => {
    ligado = !ligado;
    salvarEscolha(ligado);
    aplicar();
    mostrar();
  });
  // se já estava ligado na última visita, volta a tocar no primeiro clique em qualquer lugar
  // (antes disso o navegador bloqueia o áudio)
  if (lerEscolha()) {
    ligado = true;
    document.addEventListener('pointerdown', aplicar, { once: true });
    document.addEventListener('keydown', aplicar, { once: true });
  }
  mostrar();
  return b;
}
