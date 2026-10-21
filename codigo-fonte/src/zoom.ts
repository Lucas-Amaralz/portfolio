import Phaser from 'phaser';

// Quanto do mundo aparece no mínimo (a rua tem 512x341; ele pediu a câmera mais afastada)
const VISTA_MIN_L = 400;
const VISTA_MIN_A = 267;

// Zoom inteiro (pixel sempre do mesmo tamanho em todas as cenas) que mostra pelo menos 400x267 do mundo
export function zoomInteiro(cena: Phaser.Scene) {
  const { width, height } = cena.scale.gameSize;
  return Math.max(2, Math.floor(Math.min(width / VISTA_MIN_L, height / VISTA_MIN_A)));
}
