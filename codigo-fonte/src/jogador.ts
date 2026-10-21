import Phaser from 'phaser';
import { joystick } from './interface/toque';
import type { Direcao } from './dados/lugares';

// Linhas da folha de sprites (4x4 quadros de 48px)
export const LINHA: Record<Direcao, number> = { baixo: 0, esquerda: 1, direita: 2, cima: 3 };
const VELOCIDADE = 155; // px do mundo por segundo
const PE_Y = 46; // onde ficam os pés dentro do quadro de 48px

export function criarAnimacoes(cena: Phaser.Scene, textura: string) {
  for (const [dir, linha] of Object.entries(LINHA)) {
    const chave = `${textura}-${dir}`;
    if (cena.anims.exists(chave)) continue;
    cena.anims.create({
      key: chave,
      frames: cena.anims.generateFrameNumbers(textura, { start: linha * 4, end: linha * 4 + 3 }),
      frameRate: 14,
      repeat: -1,
    });
  }
}

export function posicionarPersonagem(sprite: Phaser.GameObjects.Sprite, olhando: Direcao) {
  sprite.setOrigin(0.5, PE_Y / 48);
  sprite.setFrame(LINHA[olhando] * 4);
  sprite.setDepth(sprite.y);
}

export class Jogador {
  sprite: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  olhando: Direcao;
  private teclas: Record<string, Phaser.Input.Keyboard.Key>;
  private alvo: Phaser.Math.Vector2 | null = null;
  private parado = 0; // ms sem sair do lugar enquanto anda até o alvo
  private eixo: 'x' | 'y' = 'x';
  private trocouEixo = false;

  constructor(private cena: Phaser.Scene, x: number, y: number, olhando: Direcao) {
    criarAnimacoes(cena, 'lucas');
    this.sprite = cena.physics.add.sprite(x, y, 'lucas');
    posicionarPersonagem(this.sprite, olhando);
    // corpo pequeno nos pés, como em Pokémon: a cabeça pode passar "atrás" das coisas
    this.sprite.body.setSize(14, 6).setOffset(17, PE_Y - 6);
    this.sprite.setCollideWorldBounds(true);
    this.olhando = olhando;

    const kb = cena.input.keyboard!;
    this.teclas = kb.addKeys('W,A,S,D,UP,LEFT,DOWN,RIGHT') as Record<string, Phaser.Input.Keyboard.Key>;
  }

  irAte(x: number, y: number) {
    this.alvo = new Phaser.Math.Vector2(x, y);
    this.parado = 0;
    this.eixo = Math.abs(x - this.sprite.x) >= Math.abs(y - this.sprite.y) ? 'x' : 'y';
    this.trocouEixo = false;
  }

  // Para no lugar (diálogo, vitrine): sem alvo, sem velocidade, quadro parado
  pararAgora() {
    this.alvo = null;
    this.sprite.setVelocity(0, 0);
    this.sprite.anims.stop();
    this.sprite.setFrame(LINHA[this.olhando] * 4);
  }

  olharPara(direcao: Direcao) {
    this.olhando = direcao;
    this.sprite.setFrame(LINHA[direcao] * 4);
  }

  get andandoAteAlvo() {
    return this.alvo !== null;
  }

  atualizar(delta: number) {
    const t = this.teclas;
    let vx = 0;
    let vy = 0;
    if (t.A.isDown || t.LEFT.isDown) vx -= 1;
    if (t.D.isDown || t.RIGHT.isDown) vx += 1;
    if (t.W.isDown || t.UP.isDown) vy -= 1;
    if (t.S.isDown || t.DOWN.isDown) vy += 1;
    if (!vx && !vy && (joystick.x || joystick.y)) {
      vx = joystick.x;
      vy = joystick.y;
    }

    if (vx || vy) {
      this.alvo = null; // teclado ou joystick mandam
    } else if (this.alvo) {
      const dx = this.alvo.x - this.sprite.x;
      const dy = this.alvo.y - this.sprite.y;
      const faltaX = Math.abs(dx) > 1.5;
      const faltaY = Math.abs(dy) > 1.5;
      if (!faltaX && !faltaY) {
        this.alvo = null;
      } else {
        // anda em L, um eixo de cada vez, como num jogo em grade
        const usarX = faltaX && (this.eixo === 'x' || !faltaY);
        if (usarX) vx = Math.sign(dx);
        else vy = Math.sign(dy);
        const corpo = this.sprite.body;
        if (corpo.deltaAbsX() < 0.1 && corpo.deltaAbsY() < 0.1) this.parado += delta;
        else this.parado = 0;
        if (this.parado > 150) {
          // bateu em algo: tenta o outro eixo uma vez, depois desiste
          if (this.trocouEixo) this.alvo = null;
          else {
            this.eixo = this.eixo === 'x' ? 'y' : 'x';
            this.trocouEixo = true;
            this.parado = 0;
          }
        }
      }
    }

    const len = Math.hypot(vx, vy) || 1;
    this.sprite.setVelocity((vx / len) * VELOCIDADE, (vy / len) * VELOCIDADE);

    if (vx || vy) {
      // olha para o eixo mais forte (na diagonal do teclado, para cima/baixo)
      if (Math.abs(vy) >= Math.abs(vx)) this.olhando = vy < 0 ? 'cima' : 'baixo';
      else this.olhando = vx < 0 ? 'esquerda' : 'direita';
      this.sprite.anims.play(`lucas-${this.olhando}`, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(LINHA[this.olhando] * 4);
    }
    this.sprite.setDepth(this.sprite.y);
  }
}
