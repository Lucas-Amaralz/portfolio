import Phaser from 'phaser';
import { BAIRROS, BAIRRO_INICIAL, type Bairro } from '../dados/bairros';
import type { Ret } from '../dados/lugares';
import { abrirPainel, type TipoPainel } from '../interface/paineis';
import { abertura } from '../interface/abertura';
import { areaDeBaixo, emPe } from '../interface/toque';
import { chuva, luzesDoMapa } from '../efeitos';
import { densidade } from '../zoom';

const LARGURA = 512;
const ALTURA = 341;
const VELOCIDADE_PINO = 180; // pixels do mundo por segundo
const ESCURECER = 0x8c8cb0; // o mapa fica um pouco apagado; o bairro sob o mouse acende

const dentro = (r: Ret, x: number, y: number) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];

interface Placa {
  caixa: Phaser.GameObjects.Graphics;
  texto: Phaser.GameObjects.Text;
}

// Mapa geral: escolher o bairro. O pino com o rosto do Lucas anda pelas ruas até ele.
export class Mapa extends Phaser.Scene {
  private aceso!: Phaser.GameObjects.Image;
  private placas: Record<string, Placa> = {};
  private pino!: Phaser.GameObjects.Container;
  private sobMouse: string | null = null;
  private ocupado = false; // pino andando, zoom ou aviso aberto

  constructor() {
    super('Mapa');
  }

  create() {
    this.placas = {};
    this.sobMouse = null;
    this.ocupado = false;

    this.add.image(0, 0, 'mapa').setOrigin(0).setTint(ESCURECER);
    this.aceso = this.add.image(0, 0, 'mapa').setOrigin(0).setVisible(false);
    this.tweens.add({ targets: this.aceso, alpha: 0.8, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    for (const [id, b] of Object.entries(BAIRROS)) this.placas[id] = this.criarPlaca(b);
    this.criarTitulo();
    luzesDoMapa(this);
    chuva(this, LARGURA, ALTURA, 9); // abaixo das placas, para os nomes continuarem fáceis de ler

    const atual = BAIRROS[this.bairroAtual()];
    const [px, py] = atual.rota[atual.rota.length - 1];
    const imagem = this.add.image(0, 0, 'pino').setOrigin(0.5, 1);
    this.pino = this.add.container(px, py, [imagem]).setDepth(20);
    this.tweens.add({ targets: imagem, y: -3, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    const cam = this.cameras.main;
    this.ajustarZoom();
    this.scale.on('resize', this.ajustarZoom, this);
    // celular em pé: os bairros também viram botões grandes embaixo do mapa
    areaDeBaixo(
      'TOQUE NO MAPA OU NUM BOTÃO ABAIXO',
      Object.entries(BAIRROS).map(([id, b]) => [b.nome, () => this.irPara(id)] as [string, () => void]),
    );
    this.events.once('shutdown', () => this.scale.off('resize', this.ajustarZoom, this));
    cam.fadeIn(250, 0, 0, 0);
    // a primeira vez que o mapa aparece, a abertura (apresentação + Jogar / Apenas ver) fica por cima dele
    if (!this.registry.get('menuVisto')) {
      this.registry.set('menuVisto', true);
      this.time.delayedCall(300, () => abertura());
    }

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.arrastar(p);
      else if (!p.wasTouch) this.acender(this.bairroEm(p.worldX, p.worldY));
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => this.clicar(p));
  }

  private bairroAtual(): string {
    return (this.registry.get('bairro') as string | undefined) ?? BAIRRO_INICIAL;
  }

  // Maior zoom inteiro que mostra pelo menos 92% do mapa (um corte pequeno na borda vale mais
  // que o mapa pequeno num canto); sobrando espaço, o mapa fica no centro. Em telas menores, arrasta.
  private ajustarZoom() {
    const { width, height } = this.scale.gameSize;
    const cam = this.cameras.main;
    // em pé, o mapa enche a altura e arrasta para os lados
    const zoom = emPe()
      ? Math.max(1, Math.floor(height / ALTURA))
      : Math.max(1, Math.floor(Math.min(width / LARGURA, height / ALTURA) / 0.92));
    cam.setZoom(zoom);
    const sobraL = Math.max(0, width / zoom - LARGURA) / 2;
    const sobraA = Math.max(0, height / zoom - ALTURA) / 2;
    if (emPe()) {
      // em pé, o mapa encosta embaixo: a sobra de altura fica em cima, atrás dos botões fixos,
      // e a torre do Currículo (no topo do mapa) não fica escondida por eles
      cam.setBounds(-sobraL, -2 * sobraA, LARGURA + 2 * sobraL, ALTURA + 2 * sobraA);
      cam.centerOn(LARGURA / 2, ALTURA - height / zoom / 2);
      return;
    }
    cam.setBounds(-sobraL, -sobraA, LARGURA + 2 * sobraL, ALTURA + 2 * sobraA);
    cam.centerOn(LARGURA / 2, ALTURA / 2);
  }

  private arrastar(p: Phaser.Input.Pointer) {
    const cam = this.cameras.main;
    cam.scrollX -= (p.x - p.prevPosition.x) / cam.zoom;
    cam.scrollY -= (p.y - p.prevPosition.y) / cam.zoom;
  }

  private criarPlaca(b: Bairro): Placa {
    const texto = this.add
      .text(b.placa[0], b.placa[1], b.nome.toUpperCase(), { fontFamily: 'Silkscreen', fontSize: '8px' })
      .setOrigin(0.5)
      .setResolution(6)
      .setDepth(11);
    const caixa = this.add.graphics().setDepth(10);
    const placa = { caixa, texto };
    this.pintarPlaca(placa, false);
    return placa;
  }

  private pintarPlaca({ caixa, texto }: Placa, aceso: boolean) {
    const l = Math.ceil(texto.width / 2) + 5;
    const { x, y } = texto;
    caixa.clear();
    caixa.fillStyle(0x0b0d1a, aceso ? 0.95 : 0.8).fillRoundedRect(x - l, y - 7, l * 2, 13, 3);
    caixa.lineStyle(1, aceso ? 0x7ff0ff : 0x55607e).strokeRoundedRect(x - l, y - 7, l * 2, 13, 3);
    texto.setColor(aceso ? '#ffffff' : '#b8c4dc');
  }

  private criarTitulo() {
    const caixa = this.add.graphics().setDepth(10);
    caixa.fillStyle(0x0b0d1a, 0.9).fillRoundedRect(8, 302, 150, 31, 4);
    caixa.lineStyle(1, 0x7ff0ff).strokeRoundedRect(8, 302, 150, 31, 4);
    const estilo = { fontFamily: 'Silkscreen', color: '#7ff0ff' };
    this.add.text(16, 306, 'MAPA DA CIDADE', { ...estilo, fontSize: '10px' }).setResolution(6).setDepth(11);
    this.add.text(16, 321, 'ESCOLHA PARA ONDE IR', { ...estilo, fontSize: '6px', color: '#b8c4dc' })
      .setResolution(6)
      .setDepth(11);
  }

  // A placa aceita toque numa área com folga de 24 px de tela para cada lado (o dedo é maior que o texto)
  private bairroEm(x: number, y: number): string | null {
    const folga = (24 * densidade()) / this.cameras.main.zoom;
    for (const id of Object.keys(BAIRROS)) {
      const placa = Phaser.Geom.Rectangle.Inflate(this.placas[id].texto.getBounds(), folga, folga);
      if (placa.contains(x, y)) return id;
    }
    for (const [id, b] of Object.entries(BAIRROS)) if (dentro(b.area, x, y)) return id;
    return null;
  }

  private acender(id: string | null) {
    if (id === this.sobMouse) return;
    if (this.sobMouse) this.pintarPlaca(this.placas[this.sobMouse], false);
    this.sobMouse = id;
    if (!id) {
      this.aceso.setVisible(false);
      this.input.setDefaultCursor('default');
      return;
    }
    const [x0, y0, x1, y1] = BAIRROS[id].area;
    this.aceso.setCrop(x0, y0, x1 - x0, y1 - y0).setVisible(true);
    this.pintarPlaca(this.placas[id], true);
    this.input.setDefaultCursor('pointer');
  }

  // Clique ou toque escolhe o bairro de uma vez (antes, no toque, o 1º só acendia e parecia não funcionar)
  private clicar(p: Phaser.Input.Pointer) {
    if (this.ocupado) return;
    if (p.getDistance() > 6) return; // foi arrasto, não clique
    const id = this.bairroEm(p.worldX, p.worldY);
    if (!id) return this.acender(null);
    this.acender(id);
    this.irPara(id);
  }

  // público: o menu também escolhe bairros
  irPara(id: string) {
    if (this.ocupado) return;
    this.ocupado = true;
    // em pé o mapa não cabe inteiro: a câmera acompanha o pino
    if (emPe()) this.cameras.main.startFollow(this.pino, false, 0.12, 0.12);
    const de = BAIRROS[this.bairroAtual()].rota;
    const para = BAIRROS[id].rota;
    // volta até o cruzamento e segue a rota nova (o cruzamento aparece nas duas)
    const caminho = id === this.bairroAtual() ? [] : [...de.slice(0, -1).reverse(), ...para.slice(1)];
    this.registry.set('bairro', id);

    // velocidade constante: a duração de cada trecho vem da distância desde o ponto anterior
    let [ax, ay] = [this.pino.x, this.pino.y];
    const passos = caminho.map(([x, y]) => {
      const duration = Math.max(1, (Phaser.Math.Distance.Between(ax, ay, x, y) / VELOCIDADE_PINO) * 1000);
      [ax, ay] = [x, y];
      return { x, y, duration };
    });

    const chegar = () => this.chegar(id);
    if (!passos.length) return chegar();
    this.tweens.chain({ targets: this.pino, tweens: passos, onComplete: chegar });
  }

  private chegar(id: string) {
    const { destino, painel } = BAIRROS[id];
    this.cameras.main.stopFollow();
    if (!destino) return this.mostrarPainel(painel ?? 'expansao');
    const cam = this.cameras.main;
    cam.pan(this.pino.x, this.pino.y - 10, 600, 'Sine.easeInOut');
    cam.zoomTo(cam.zoom * 3, 600, 'Sine.easeIn');
    this.time.delayedCall(350, () => cam.fadeOut(250, 0, 0, 0));
    cam.once('camerafadeoutcomplete', () => this.scene.start('Lugar', destino));
  }

  // Aproxima do prédio, abre o painel e, ao fechar, volta ao mapa inteiro
  private async mostrarPainel(tipo: TipoPainel) {
    const cam = this.cameras.main;
    const zoom = cam.zoom;
    cam.pan(this.pino.x, this.pino.y - 10, 500, 'Sine.easeInOut');
    cam.zoomTo(zoom * 2, 500, 'Sine.easeInOut');
    await new Promise((r) => this.time.delayedCall(520, r));
    if (await abrirPainel(tipo)) return; // o painel levou para outro lugar
    cam.pan(LARGURA / 2, ALTURA / 2, 400, 'Sine.easeInOut');
    cam.zoomTo(zoom, 400, 'Sine.easeInOut');
    this.time.delayedCall(420, () => {
      this.ajustarZoom();
      this.ocupado = false;
    });
  }
}
