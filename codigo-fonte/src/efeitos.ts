import Phaser from 'phaser';

// Efeitos que deixam a cidade viva: chuva e luzes piscando. Tudo desenhado por código, sem arte nova.
// Quem pediu menos movimento no sistema (prefers-reduced-motion) não vê nenhum deles.
const poucoMovimento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// texturas criadas uma vez só: gota (risco fino) e brilho (círculo que some nas bordas)
function texturas(cena: Phaser.Scene) {
  if (!cena.textures.exists('gota')) {
    const g = cena.make.graphics({}, false);
    g.fillStyle(0xffffff).fillRect(0, 0, 1, 5);
    g.generateTexture('gota', 1, 5);
    g.destroy();
  }
  if (!cena.textures.exists('brilho')) {
    const t = cena.textures.createCanvas('brilho', 32, 32)!;
    const ctx = t.getContext();
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
    t.refresh();
  }
}

// Chuva fina caindo em diagonal leve sobre um retângulo do mundo
export function chuva(cena: Phaser.Scene, largura: number, altura: number, profundidade: number) {
  if (poucoMovimento()) return;
  texturas(cena);
  const velocidade = 300;
  cena.add
    .particles(0, 0, 'gota', {
      x: { min: 0, max: largura + 40 }, // começa um pouco à direita: a gota anda para a esquerda ao cair
      y: -6,
      speedY: { min: velocidade, max: velocidade * 1.2 },
      speedX: -40,
      rotate: 7, // o risco acompanha a inclinação da queda
      lifespan: ((altura + 12) / velocidade) * 1000,
      quantity: Math.max(1, Math.round(largura / 128)),
      frequency: 30,
      alpha: { min: 0.18, max: 0.38 },
      tint: 0xa8c0ff,
    })
    .setDepth(profundidade);
}

// Luz que pulsa (alpha) num ponto: brilho grande em modo de soma de cores
function luz(cena: Phaser.Scene, x: number, y: number, cor: number, tamanho: number, piscar: object) {
  const b = cena.add.image(x, y, 'brilho').setTint(cor).setScale(tamanho / 32).setBlendMode('ADD').setDepth(5);
  cena.tweens.add({ targets: b, repeat: -1, ...piscar });
  return b;
}

// Luzes do mapa geral (coordenadas no mundo do mapa, 512x341)
export function luzesDoMapa(cena: Phaser.Scene) {
  if (poucoMovimento()) return;
  texturas(cena);
  // aviso vermelho no alto da torre de rádio (Contato): acende e apaga, como em torre de verdade
  luz(cena, 412, 141, 0xff3344, 14, { alpha: { from: 1, to: 0.05 }, duration: 700, yoyo: true, hold: 300, repeatDelay: 400 });
  // farol (Certificações): pulso quente e lento
  luz(cena, 37, 18, 0xffd27a, 26, { alpha: { from: 0.95, to: 0.25 }, duration: 1400, yoyo: true, ease: 'Sine.inOut' });
  // globo da Praça Central: respira em ciano
  luz(cena, 258, 146, 0x5ff3ff, 40, { alpha: { from: 0.45, to: 0.12 }, duration: 2200, yoyo: true, ease: 'Sine.inOut' });
}
