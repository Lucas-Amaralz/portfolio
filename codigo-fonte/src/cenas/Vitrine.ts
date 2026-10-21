import Phaser from 'phaser';
import DADOS from '../dados/projetos.json';
import { cartao, dica, type Item } from '../interface/interface';
import { zoomInteiro } from '../zoom';

// A vitrine da loja de Projetos vista pelo vidro: duas prateleiras com 4 pedestais cada.
// Cada projeto de projetos.json ocupa um pedestal, na ordem do arquivo (em cima da esquerda
// para a direita, depois embaixo); pedestal sem projeto mostra a plaquinha "Em breve".
// Mesma arte reduzida 3x e mesmo zoom das outras cenas, para o pixel ter o mesmo tamanho.

interface Projeto extends Item {
  id: string;
  curto?: string; // nome menor para a etiqueta, quando o nome não cabe
  etiqueta: string;
  area: string;
}
const PROJETOS = DADOS as Projeto[];

// centro dos pedestais e linha do tampo (onde o objeto se apoia), no mundo 512x341
const COLUNAS = [133, 217, 305, 387];
const TAMPO = [146, 238];
const ETIQUETA_Y = [158, 250]; // topo da etiqueta, por cima da plaquinha da arte
const ETIQUETA_L = 80;
const ETIQUETA_A = 22;
// onde a câmera mira na altura para cada prateleira: em cima mostra o letreiro, embaixo as etiquetas
const MIRA_Y = [95, 185];
// a moldura da vitrine inteira; quando ela cabe na tela, a câmera fica parada no centro dela
const MOLDURA = { x: 40, y: 0, l: 432, a: 290 };
const ESPACO_DICA = 56; // px de tela livres embaixo para a dica de controles
const POR_LINHA = COLUNAS.length;
const VAGAS = POR_LINHA * TAMPO.length;
const DICA = '<b>← → ↑ ↓</b> escolher · <b>E</b> abrir · <b>ESC</b> voltar à loja';
const DICA_TOQUE = 'Toque num projeto para ver';

interface Peca {
  projeto: Projeto;
  objeto: Phaser.GameObjects.Image;
  brilho: Phaser.GameObjects.Image;
  moldura: Phaser.GameObjects.Graphics;
  y0: number;
  cx: number;
  linha: number;
}

const cor = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

export class Vitrine extends Phaser.Scene {
  private pecas: Peca[] = [];
  private atual = 0;
  private seta!: Phaser.GameObjects.Triangle;
  private aberto = false; // cartão aberto
  private saindo = false;

  constructor() {
    super('Vitrine');
  }

  create() {
    this.pecas = [];
    this.atual = 0;
    this.aberto = false;
    this.saindo = false;
    this.add.image(0, 0, 'vitrine').setOrigin(0);

    const zoom = this.zoomVitrine();
    const res = zoom * Math.max(1, window.devicePixelRatio);
    const texto = (x: number, y: number, t: string, fonte: string, tam: number, c: string) =>
      this.add.text(x, y, t, { fontFamily: fonte, fontSize: `${tam}px`, color: c }).setOrigin(0.5).setResolution(res).setDepth(5);

    if (PROJETOS.length > VAGAS) console.warn(`A vitrine tem ${VAGAS} lugares; ${PROJETOS.length - VAGAS} projeto(s) ficaram de fora.`);

    for (let v = 0; v < VAGAS; v++) {
      const linha = Math.floor(v / POR_LINHA);
      const cx = COLUNAS[v % POR_LINHA];
      const ey = ETIQUETA_Y[linha];
      const ex = cx - ETIQUETA_L / 2;
      const projeto = PROJETOS[v];

      if (!projeto) {
        const g = this.add.graphics().setDepth(4);
        g.fillStyle(0x0b0a1c, 1).fillRoundedRect(cx - 28, ey + 2, 56, 15, 3);
        g.lineStyle(1, 0x4a4f80, 1).strokeRoundedRect(cx - 27.5, ey + 2.5, 55, 14, 3);
        texto(cx, ey + 10, 'EM BREVE', 'Silkscreen', 7, '#7d82ad');
        continue;
      }

      const chave = `objeto-${projeto.id}`;
      const y0 = TAMPO[linha];
      const objeto = this.add.image(cx, y0, chave).setOrigin(0.5, 1).setDepth(2);
      // cópia somada por cima: "acende" o objeto escolhido
      const brilho = this.add.image(cx, y0, chave).setOrigin(0.5, 1).setDepth(3);
      brilho.setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);

      const moldura = this.add.graphics().setDepth(4);
      const nome = texto(cx, ey + 8, (projeto.curto ?? projeto.nome).toUpperCase(), 'Silkscreen', 7, projeto.cor);
      const sub = texto(cx, ey + 16, `${projeto.etiqueta} · ${projeto.area}`, 'system-ui, "Segoe UI", sans-serif', 6, '#c9cce6');
      // o texto é encolhido se não couber na etiqueta
      const larg = ETIQUETA_L - 8;
      for (const t of [nome, sub]) if (t.width > larg) t.setScale(larg / t.width);

      const i = this.pecas.length;
      this.pecas.push({ projeto, objeto, brilho, moldura, y0, cx, linha });

      // a área clicável junta o objeto e a etiqueta
      const topo = y0 - objeto.height;
      const zona = this.add.zone(ex, topo, ETIQUETA_L, ey + ETIQUETA_A - topo).setOrigin(0);
      zona.setInteractive({ useHandCursor: true });
      zona.on('pointerover', (p: Phaser.Input.Pointer) => !p.wasTouch && this.selecionar(i));
      // no toque, o 1º toque num vizinho só o escolhe (a câmera vai até ele) e o 2º abre
      zona.on('pointerdown', (p: Phaser.Input.Pointer) => {
        if (p.wasTouch && i !== this.atual) return this.selecionar(i);
        this.selecionar(i);
        this.abrir();
      });
    }

    this.seta = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 5, 0xffffff).setOrigin(0.5, 1).setDepth(6);

    const cam = this.cameras.main;
    cam.setZoom(zoom);
    cam.setBackgroundColor('#0a0b1a'); // cobre a loja (pausada por baixo) quando a tela é maior que a vitrine
    this.scale.on('resize', this.ajustar, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.ajustar, this));

    const kb = this.input.keyboard!;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, () => this.selecionar(this.atual - 1));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, () => this.selecionar(this.atual + 1));
    for (const k of ['UP', 'W']) kb.on(`keydown-${k}`, () => this.trocarLinha(-1));
    for (const k of ['DOWN', 'S']) kb.on(`keydown-${k}`, () => this.trocarLinha(1));
    for (const k of ['E', 'ENTER', 'SPACE']) kb.on(`keydown-${k}`, () => this.abrir());
    kb.on('keydown-ESC', () => this.sair());

    const voltar = document.getElementById('btn-voltar')!;
    const aoVoltar = () => this.sair();
    voltar.hidden = false;
    voltar.addEventListener('click', aoVoltar);
    this.events.once('shutdown', () => {
      voltar.hidden = true;
      voltar.removeEventListener('click', aoVoltar);
      dica(null);
    });
    dica(DICA, DICA_TOQUE);

    this.selecionar(0, true);
    cam.fadeIn(200, 0, 0, 0);
  }

  // A vitrine é um "close": usa o maior zoom inteiro em que ela cabe inteira, com a dica embaixo.
  // Onde nem 2x cabe (celular), fica no zoom das outras cenas e a câmera segue o escolhido.
  private zoomVitrine() {
    const { width, height } = this.scale.gameSize;
    const cabe = Math.floor(Math.min(width / MOLDURA.l, (height - ESPACO_DICA) / MOLDURA.a));
    return cabe >= 2 ? cabe : zoomInteiro(this);
  }

  private cabeInteira() {
    const cam = this.cameras.main;
    return cam.width / cam.zoom >= MOLDURA.l && (cam.height - ESPACO_DICA) / cam.zoom >= MOLDURA.a;
  }

  private ajustar() {
    this.cameras.main.setZoom(this.zoomVitrine());
    this.mirar(true);
  }

  // a câmera centraliza o objeto escolhido (em telas menores a vitrine não cabe inteira)
  private mirar(direto = false) {
    const p = this.pecas[this.atual];
    if (!p) return;
    const cam = this.cameras.main;
    if (this.cabeInteira()) {
      cam.removeBounds();
      // o centro sobe metade do espaço da dica, para a moldura não ficar por baixo dela
      cam.centerOn(MOLDURA.x + MOLDURA.l / 2, MOLDURA.y + MOLDURA.a / 2 + ESPACO_DICA / 2 / cam.zoom);
      return;
    }
    cam.setBounds(0, 0, 512, 341);
    if (direto) cam.centerOn(p.cx, MIRA_Y[p.linha]);
    else cam.pan(p.cx, MIRA_Y[p.linha], 250, 'Sine.easeOut', true);
  }

  // ↑ ↓: o projeto da mesma coluna na outra prateleira, se existir
  private trocarLinha(passo: number) {
    const alvo = this.atual + passo * POR_LINHA;
    if (alvo >= 0 && alvo < this.pecas.length) this.selecionar(alvo);
  }

  private selecionar(i: number, direto = false) {
    if (this.aberto || !this.pecas.length) return;
    i = Phaser.Math.Clamp(i, 0, this.pecas.length - 1);
    if (i === this.atual && !direto) return;
    this.atual = i;
    this.pecas.forEach((p, j) => {
      const sel = j === i;
      this.tweens.killTweensOf([p.objeto, p.brilho]);
      // o escolhido levanta 3 px e acende; os outros voltam
      this.tweens.add({ targets: [p.objeto, p.brilho], y: sel ? p.y0 - 3 : p.y0, duration: 140, ease: 'Quad.out' });
      if (sel) this.tweens.add({ targets: p.brilho, alpha: { from: 0.12, to: 0.3 }, duration: 700, yoyo: true, repeat: -1 });
      else p.brilho.setAlpha(0);
      this.desenharEtiqueta(p, j, sel);
    });
    const p = this.pecas[i];
    this.tweens.killTweensOf(this.seta);
    this.seta.setPosition(p.cx, p.y0 - p.objeto.height - 6).setFillStyle(cor(p.projeto.cor));
    this.tweens.add({ targets: this.seta, y: '-=3', duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.mirar(direto);
  }

  private desenharEtiqueta(p: Peca, j: number, sel: boolean) {
    const x0 = COLUNAS[j % POR_LINHA] - ETIQUETA_L / 2;
    const y0 = ETIQUETA_Y[p.linha];
    const c = cor(p.projeto.cor);
    const g = p.moldura.clear();
    g.fillStyle(0x0b0a1c, 1).fillRoundedRect(x0, y0, ETIQUETA_L, ETIQUETA_A, 3);
    if (sel) g.fillStyle(c, 0.14).fillRoundedRect(x0, y0, ETIQUETA_L, ETIQUETA_A, 3);
    g.lineStyle(1, c, sel ? 1 : 0.45).strokeRoundedRect(x0 + 0.5, y0 + 0.5, ETIQUETA_L - 1, ETIQUETA_A - 1, 3);
  }

  private async abrir() {
    if (this.aberto || this.saindo || !this.pecas.length) return;
    this.aberto = true;
    dica(null);
    const ultimo = await cartao(this.pecas.map((p) => p.projeto), this.atual, 'LOJA DE PROJETOS', 'à vitrine');
    this.aberto = false;
    dica(DICA, DICA_TOQUE);
    this.selecionar(ultimo);
  }

  private sair() {
    if (this.aberto || this.saindo) return;
    this.saindo = true;
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.resume('Lugar');
      this.scene.stop();
    });
  }
}
