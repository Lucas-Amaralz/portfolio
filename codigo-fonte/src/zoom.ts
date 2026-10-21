import Phaser from 'phaser';

// O jogo desenha nos pixels reais da tela (no celular, 2 a 3 por pixel de CSS): assim o zoom
// inteiro tem passos finos e o pixel art continua nítido. Tudo que mede a tela usa essa unidade.
export const densidade = () => Math.min(window.devicePixelRatio || 1, 3);

// Quanto do mundo aparece no mínimo. Em pé (celular), conta a largura: a cena é deitada.
const VISTA_DEITADA = [400, 267];
const VISTA_EM_PE = [300, 200];

// Zoom inteiro (pixel sempre do mesmo tamanho em todas as cenas) que mostra pelo menos a vista mínima
export function zoomInteiro(cena: Phaser.Scene) {
  const { width, height } = cena.scale.gameSize;
  const [l, a] = height > width ? VISTA_EM_PE : VISTA_DEITADA;
  return Math.max(1, Math.floor(Math.min(width / l, height / a)));
}
