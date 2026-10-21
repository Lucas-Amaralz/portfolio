import Phaser from 'phaser';
import { LUGARES } from '../dados/lugares';
import PROJETOS from '../dados/projetos.json';

export class Carregar extends Phaser.Scene {
  constructor() {
    super('Carregar');
  }

  preload() {
    this.load.setPath('arte/');
    for (const lugar of Object.values(LUGARES)) this.load.image(lugar.fundo, `${lugar.fundo}.png`);
    this.load.image('mapa', 'mapa.png');
    this.load.image('pino', 'pino.png');
    this.load.image('vitrine', 'vitrine.png');
    for (const p of PROJETOS) this.load.image(`objeto-${p.id}`, `objeto-${p.id}.png`);
    this.load.spritesheet('lucas', 'lucas.png', { frameWidth: 48, frameHeight: 48 });
    this.load.spritesheet('vendedor', 'vendedor.png', { frameWidth: 48, frameHeight: 48 });
    this.load.json('camadas', 'camadas.json');
    this.load.once('filecomplete-json-camadas', () => {
      const camadas = this.cache.json.get('camadas') as Record<string, { chave: string }[]>;
      for (const lista of Object.values(camadas)) {
        for (const c of lista) this.load.image(c.chave, `${c.chave}.png`);
      }
    });
  }

  create() {
    this.scene.start('Mapa');
  }
}
