import Phaser from 'phaser';
import { joystick } from './interface/toque';
import { acharCaminho } from './caminho';
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
  private caminho: [number, number][] = []; // pontos até o alvo, desviando dos bloqueios
  private parado = 0; // ms sem sair do lugar enquanto anda até o alvo

  // `livre` diz se os pés cabem num ponto (sem ela, anda em linha reta até o alvo)
  constructor(
    private cena: Phaser.Scene,
    x: number,
    y: number,
    olhando: Direcao,
    private livre?: (x: number, y: number) => boolean,
  ) {
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
    const { width, height } = this.cena.physics.world.bounds;
    const caminho = this.livre ? acharCaminho(this.livre, [this.sprite.x, this.sprite.y], [x, y], width, height) : [[x, y] as [number, number]];
    this.caminho = caminho ?? [];
    const ultimo = this.caminho[this.caminho.length - 1];
    this.alvo = ultimo ? new Phaser.Math.Vector2(...ultimo) : null;
    this.parado = 0;
  }

  // Para no lugar (diálogo, vitrine): sem alvo, sem velocidade, quadro parado
  pararAgora() {
    this.alvo = null;
    this.caminho = [];
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
      // joystick: só a direção (anda sempre na velocidade cheia, como no teclado)
      const forca = Math.hypot(joystick.x, joystick.y);
      vx = joystick.x / forca;
      vy = joystick.y / forca;
    }

    if (vx || vy) {
      this.alvo = null; // teclado ou joystick mandam
      this.caminho = [];
    } else if (this.alvo) {
      // segue o caminho ponto a ponto; cada trecho é reto (horizontal ou vertical)
      while (this.caminho.length) {
        const [px, py] = this.caminho[0];
        if (Math.abs(px - this.sprite.x) > 0.75 || Math.abs(py - this.sprite.y) > 0.75) break;
        this.caminho.shift();
      }
      const ponto = this.caminho[0];
      if (!ponto) {
        this.alvo = null;
      } else {
        let dx = ponto[0] - this.sprite.x;
        let dy = ponto[1] - this.sprite.y;
        // Perto do ponto (menos de um passo), ele é colocado em cima dele. Sem isso passava do ponto,
        // voltava e passava de novo, virando de um lado para o outro ("girando"): a física anda em passos
        // fixos e a tela pode atualizar em outro ritmo, então frear pela velocidade não fecha a conta.
        const passo = (VELOCIDADE * Math.max(delta, 1000 / 60) * 2) / 1000;
        const corpo = this.sprite.body;
        if (dx !== 0 && Math.abs(dx) <= passo) {
          corpo.reset(ponto[0], this.sprite.y);
          dx = 0;
        }
        if (dx === 0 && dy !== 0 && Math.abs(dy) <= passo) {
          corpo.reset(this.sprite.x, ponto[1]);
          dy = 0;
        }
        // um eixo de cada vez, como num RPG de grade: ele sempre olha para onde está andando
        if (dx !== 0) vx = Math.sign(dx);
        else if (dy !== 0) vy = Math.sign(dy);
        if (corpo.deltaAbsX() < 0.1 && corpo.deltaAbsY() < 0.1) this.parado += delta;
        else this.parado = 0;
        if (this.parado > 400) {
          // preso mesmo assim (algo fora do mapa de bloqueios): desiste
          this.alvo = null;
          this.caminho = [];
        }
      }
    }

    // na diagonal do teclado não anda mais rápido; perto do ponto do caminho, anda só o que falta
    const len = Math.max(1, Math.hypot(vx, vy));
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
