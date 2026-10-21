import Phaser from 'phaser';
import { Carregar } from './cenas/Carregar';
import { Lugar } from './cenas/Lugar';
import { Mapa } from './cenas/Mapa';
import { Vitrine } from './cenas/Vitrine';
import { iniciarBotoesFixos } from './interface/paineis';
import { definirJogo } from './navegacao';

// ?debug na URL mostra os corpos de colisão
const debug = new URLSearchParams(location.search).has('debug');

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
    scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
    physics: { default: 'arcade', arcade: { debug } },
    input: { activePointers: 1 },
    scene: [Carregar, Mapa, Lugar, Vitrine],
  });
  definirJogo(jogo);
  iniciarBotoesFixos();
  // se a aba abriu em segundo plano ou a janela mudou de tamanho sem aviso, o canvas pode
  // ficar com o tamanho antigo; refaz a medida sempre que a área do jogo muda ou a aba volta
  const refazer = () => jogo.scale.refresh();
  new ResizeObserver(refazer).observe(document.getElementById('jogo')!);
  document.addEventListener('visibilitychange', () => !document.hidden && refazer());
  // ?teste expõe o jogo para os scripts de teste automático
  if (new URLSearchParams(location.search).has('teste')) (window as unknown as { jogo: Phaser.Game }).jogo = jogo;
}

iniciar();
