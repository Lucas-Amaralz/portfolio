import Phaser from 'phaser';
import { Carregar } from './cenas/Carregar';
import { Lugar } from './cenas/Lugar';
import { Mapa } from './cenas/Mapa';
import { Vitrine } from './cenas/Vitrine';
import { iniciarBotoesFixos } from './interface/paineis';
import { definirJogo } from './navegacao';
import { densidade } from './zoom';

// ?debug na URL mostra os corpos de colisão
const debug = new URLSearchParams(location.search).has('debug');

// área do jogo em pixels reais da tela
function tamanho() {
  const area = document.getElementById('jogo')!;
  const d = densidade();
  return { width: Math.round(area.clientWidth * d), height: Math.round(area.clientHeight * d) };
}

async function iniciar() {
  const fonte = new FontFace('Silkscreen', 'url(fontes/Silkscreen-Regular.ttf)');
  try {
    document.fonts.add(await fonte.load());
  } catch {
    // sem a fonte, o "E" sai na fonte padrão; o jogo continua
  }

  const jogo = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'jogo',
    backgroundColor: '#0b0d1a',
    pixelArt: true,
    roundPixels: true,
    // tamanho em pixels reais da tela; o canvas é mostrado reduzido (zoom 1/densidade) no tamanho de CSS
    scale: { mode: Phaser.Scale.NONE, ...tamanho(), zoom: 1 / densidade() },
    physics: { default: 'arcade', arcade: { debug } },
    input: { activePointers: 1 },
    scene: [Carregar, Mapa, Lugar, Vitrine],
  });
  definirJogo(jogo);
  iniciarBotoesFixos();
  // se a aba abriu em segundo plano ou a janela mudou de tamanho sem aviso, o canvas pode
  // ficar com o tamanho antigo; refaz a medida sempre que a área do jogo muda ou a aba volta
  const refazer = () => {
    jogo.scale.setZoom(1 / densidade());
    const { width, height } = tamanho();
    jogo.scale.resize(width, height);
  };
  new ResizeObserver(refazer).observe(document.getElementById('jogo')!);
  document.addEventListener('visibilitychange', () => !document.hidden && refazer());
  // ?teste expõe o jogo para os scripts de teste automático
  if (new URLSearchParams(location.search).has('teste')) (window as unknown as { jogo: Phaser.Game }).jogo = jogo;
}

iniciar();
