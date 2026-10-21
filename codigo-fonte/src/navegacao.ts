import type Phaser from 'phaser';
import { BAIRROS } from './dados/bairros';

// Os painéis em HTML (menu, telão, contato) levam o jogador a outros lugares sem passar pelo mapa
let jogo: Phaser.Game;
const CENAS = ['Vitrine', 'Lugar', 'Mapa'];

export function definirJogo(j: Phaser.Game) {
  jogo = j;
}

// Vai direto para o lugar do bairro (Projetos -> rua, Experiência -> trilha)
export function irParaBairro(id: string) {
  const destino = BAIRROS[id]?.destino;
  if (!destino) return;
  jogo.registry.set('bairro', id); // o pino do mapa fica no bairro certo na volta
  for (const c of CENAS) if (jogo.scene.isActive(c) || jogo.scene.isPaused(c)) jogo.scene.stop(c);
  jogo.scene.start('Lugar', destino);
}

// No mapa, o pino anda até o bairro; em outro lugar, vai direto
export function escolherBairro(id: string) {
  const mapa = jogo.scene.getScene('Mapa') as Phaser.Scene & { irPara(id: string): void };
  if (jogo.scene.isActive('Mapa')) mapa.irPara(id);
  else irParaBairro(id);
}

// Enquanto um painel está aberto, a cena de baixo para (o Lucas não segue andando por baixo)
export function pausarCenas(): () => void {
  const pausadas = CENAS.filter((c) => jogo.scene.isActive(c));
  for (const c of pausadas) jogo.scene.pause(c);
  return () => {
    for (const c of pausadas) if (jogo.scene.isPaused(c)) jogo.scene.resume(c);
  };
}
