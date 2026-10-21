import Phaser from 'phaser';
import {
  LUGARES,
  type Chegada,
  type Interacao,
  type Lugar as DadosLugar,
  type Placa,
  type Porta,
  type Ret,
} from '../dados/lugares';
import { Jogador, LINHA, criarAnimacoes, posicionarPersonagem } from '../jogador';
import { cartao, dialogo, type Item } from '../interface/interface';
import EXPERIENCIAS from '../dados/experiencias.json';
import { zoomInteiro } from '../zoom';
import { areaDeBaixo, mostrarControles } from '../interface/toque';

interface Camada {
  chave: string;
  x: number;
  y: number;
  base: number;
}

const DICA_TOQUE = 'JOYSTICK PARA ANDAR · E PARA INTERAGIR';

const dentro = (r: Ret, x: number, y: number) => x >= r[0] && x < r[2] && y >= r[1] && y < r[3];
const centro = (r: Ret) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2] as const;

// Uma cena serve para todos os lugares: ela monta o que está em dados/lugares.ts
export class Lugar extends Phaser.Scene {
  private dados!: DadosLugar;
  private jogador!: Jogador;
  private tecla!: Phaser.GameObjects.Container;
  private avisos: Phaser.GameObjects.Container[] = [];
  private npcs = new Map<string, Phaser.GameObjects.Sprite>();
  private portaAlvo: Porta | null = null; // porta tocada no celular
  private interacaoAlvo: Interacao | null = null; // NPC/objeto tocado no celular
  private saindo = false;
  private ocupado = false; // diálogo ou vitrine aberta: o Lucas não anda

  constructor() {
    super('Lugar');
  }

  create(dados: { lugar: string; chegada: Chegada }) {
    this.dados = LUGARES[dados.lugar];
    this.portaAlvo = null;
    this.interacaoAlvo = null;
    this.saindo = false;
    this.ocupado = false;
    this.npcs.clear();
    const { largura, altura } = this.dados;

    this.add.image(0, 0, this.dados.fundo).setOrigin(0).setDepth(-1);

    const camadas = (this.cache.json.get('camadas') as Record<string, Camada[]>)[dados.lugar] ?? [];
    for (const c of camadas) this.add.image(c.x, c.y, c.chave).setOrigin(0).setDepth(c.base);

    for (const placa of this.dados.placas ?? []) this.escreverPlaca(placa);

    for (const npc of this.dados.npcs) {
      criarAnimacoes(this, npc.textura);
      const sprite = this.add.sprite(npc.x, npc.y, npc.textura);
      posicionarPersonagem(sprite, npc.olhando);
      this.npcs.set(npc.textura, sprite);
    }

    this.physics.world.setBounds(0, 0, largura, altura);
    const paredes = this.physics.add.staticGroup();
    for (const [x0, y0, x1, y1] of this.dados.bloqueios) {
      const zona = this.add.zone(x0, y0, x1 - x0, y1 - y0).setOrigin(0);
      paredes.add(zona);
    }

    this.jogador = new Jogador(this, dados.chegada.x, dados.chegada.y, dados.chegada.olhando);
    this.physics.add.collider(this.jogador.sprite, paredes);

    this.tecla = this.criarTeclaE();
    this.avisos = this.dados.interacoes.filter((i) => i.aviso).map((i) => this.criarAviso(i));

    const cam = this.cameras.main;
    cam.startFollow(this.jogador.sprite, true, 0.2, 0.2);
    // o Lucas fica um pouco abaixo do centro: assim cabem as placas e fachadas acima dele
    cam.setFollowOffset(0, this.dados.cameraY ?? 50);
    this.ajustarZoom();
    this.scale.on('resize', this.ajustarZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.ajustarZoom, this));
    cam.fadeIn(200, 0, 0, 0);

    const usar = () => {
      if (this.ocupado || this.saindo || !this.scene.isActive()) return;
      const porta = this.portaParaTecla();
      if (porta) return this.entrar(porta);
      const coisa = this.interacaoParaTecla();
      if (coisa) this.interagir(coisa);
    };
    this.input.keyboard!.on('keydown-E', usar);
    // botão de ação do celular
    window.addEventListener('acao-toque', usar);
    mostrarControles(true);
    areaDeBaixo(DICA_TOQUE);
    this.events.once('shutdown', () => {
      window.removeEventListener('acao-toque', usar);
      mostrarControles(false);
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.tocar(p.worldX, p.worldY));

    // voltar ao mapa: botão no canto (HTML, para não depender do zoom) ou tecla M
    const botao = document.getElementById('btn-mapa')!;
    const voltar = () => this.voltarAoMapa();
    botao.hidden = false;
    botao.addEventListener('click', voltar);
    this.input.keyboard!.on('keydown-M', voltar);
    // a vitrine roda por cima com esta cena pausada; ao fechar, o Lucas volta a andar
    this.events.on('resume', this.liberar, this);
    this.events.once('shutdown', () => {
      botao.hidden = true;
      botao.removeEventListener('click', voltar);
      this.events.off('resume', this.liberar, this);
    });
  }

  private voltarAoMapa() {
    if (this.saindo || this.ocupado) return;
    this.saindo = true;
    this.jogador.sprite.setVelocity(0, 0);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Mapa'));
  }

  private ajustarZoom() {
    const cam = this.cameras.main;
    const zoom = zoomInteiro(this);
    cam.setZoom(zoom);
    // lugar menor que a tela: os limites da câmera crescem por igual dos dois lados e o lugar
    // fica centralizado, com o fundo escuro em volta (sem isso ele gruda no canto de cima à esquerda)
    const { largura, altura } = this.dados;
    const vistaL = this.scale.gameSize.width / zoom;
    const vistaA = this.scale.gameSize.height / zoom;
    const sobraL = Math.max(0, vistaL - largura) / 2;
    const sobraA = Math.max(0, vistaA - altura) / 2;
    cam.setBounds(-sobraL, -sobraA, largura + 2 * sobraL, altura + 2 * sobraA);
  }

  // Nome por cima da arte; encolhe (em passos de meio) até caber no espaço da placa
  private escreverPlaca({ texto, x, y, largura, cor, fundo }: Placa) {
    const t = this.add.text(x, y, texto, { fontFamily: 'Silkscreen', fontSize: '8px', color: cor, align: 'center' });
    t.setOrigin(0.5).setResolution(8).setDepth(0).setLineSpacing(-2);
    let escala = 1;
    while (t.width * escala > largura && escala > 0.5) escala -= 0.125;
    t.setScale(escala);
    if (fundo) {
      const w = Math.ceil(t.displayWidth) + 6;
      const h = Math.ceil(t.displayHeight) + 2;
      const placa = this.add.graphics().setDepth(-0.5);
      placa.fillStyle(Phaser.Display.Color.HexStringToColor(fundo).color, 0.92).fillRect(x - w / 2, y - h / 2, w, h);
      placa.lineStyle(1, Phaser.Display.Color.HexStringToColor(cor).color, 0.6).strokeRect(x - w / 2, y - h / 2, w, h);
    }
  }

  private criarTeclaE() {
    const caixa = this.add.graphics();
    caixa.fillStyle(0x1a1205, 0.9).fillRoundedRect(-6, -7, 12, 13, 2);
    caixa.lineStyle(1, 0xffc46b).strokeRoundedRect(-6, -7, 12, 13, 2);
    const letra = this.add.text(0, 0, 'E', { fontFamily: 'Silkscreen', fontSize: '8px', color: '#ffc46b' });
    letra.setOrigin(0.5).setResolution(4);
    const tecla = this.add.container(0, 0, [caixa, letra]).setDepth(10000).setVisible(false);
    this.tweens.add({ targets: letra, y: -1, duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return tecla;
  }

  // Balão "!" em cima de quem tem conversa, balançando de leve
  private criarAviso(coisa: Interacao) {
    const [x0, y0, x1] = coisa.toque;
    const [ax, ay] = coisa.avisoEm ?? [Math.round((x0 + x1) / 2), y0 - 4]; // padrão: um pouco acima da cabeça
    const g = this.add.graphics();
    g.fillStyle(0x1a1205, 0.95).fillRoundedRect(-5, -14, 10, 11, 3);
    g.fillTriangle(-2, -4, 2, -4, 0, -1);
    g.lineStyle(1, 0xffc46b).strokeRoundedRect(-5, -14, 10, 11, 3);
    const marca = this.add.text(0, -8.5, '!', { fontFamily: 'Silkscreen', fontSize: '8px', color: '#ffc46b' });
    marca.setOrigin(0.5).setResolution(4);
    const aviso = this.add.container(ax, ay, [g, marca]).setDepth(9999);
    this.tweens.add({ targets: aviso, y: ay - 2, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    return aviso;
  }

  private portaParaTecla(): Porta | null {
    const { x, y } = this.jogador.sprite;
    return (
      this.dados.portas.find(
        (p) => p.modo === 'tecla' && dentro(p.area, x, y) && (!p.olhandoPara || p.olhandoPara === this.jogador.olhando),
      ) ?? null
    );
  }

  private interacaoParaTecla(): Interacao | null {
    const { x, y } = this.jogador.sprite;
    return (
      this.dados.interacoes.find(
        (i) => dentro(i.area, x, y) && (!i.olhandoPara || i.olhandoPara === this.jogador.olhando),
      ) ?? null
    );
  }

  // Toque/clique: na porta ou num NPC/objeto, anda até ele e usa; em outro lugar, só anda
  private tocar(x: number, y: number) {
    if (this.saindo || this.ocupado) return;
    const coisa = this.dados.interacoes.find((i) => dentro(i.toque, x, y));
    const porta = coisa
      ? undefined
      : this.dados.portas.find((p) => {
          const [x0, y0, x1, y1] = p.area;
          return p.modo === 'tecla' && dentro([x0, y0 - 40, x1, y1], x, y); // a porta desenhada fica acima da área
        });
    this.portaAlvo = porta ?? null;
    this.interacaoAlvo = coisa ?? null;
    const alvo = porta?.area ?? coisa?.area;
    if (alvo) this.jogador.irAte(...centro(alvo));
    else this.jogador.irAte(x, y);
  }

  private entrar(porta: Porta) {
    if (this.saindo) return;
    this.saindo = true;
    this.jogador.sprite.setVelocity(0, 0);
    this.cameras.main.fadeOut(200, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.restart({ lugar: porta.destino, chegada: porta.chegada });
    });
  }

  private parar() {
    this.ocupado = true;
    this.jogador.pararAgora();
    this.tecla.setVisible(false);
    for (const a of this.avisos) a.setVisible(false);
    document.getElementById('btn-mapa')!.hidden = true;
    mostrarControles(false);
  }

  private liberar() {
    this.ocupado = false;
    for (const a of this.avisos) a.setVisible(true);
    document.getElementById('btn-mapa')!.hidden = false;
    mostrarControles(true);
    areaDeBaixo(DICA_TOQUE); // a vitrine troca a área de baixo; ao voltar, é a da cena de novo
  }

  private async interagir(coisa: Interacao) {
    this.interacaoAlvo = null;
    this.parar();
    if (coisa.acao === 'vendedor') {
      const vendedor = this.npcs.get('vendedor');
      if (vendedor) this.virarPara(vendedor);
      const escolha = await dialogo(
        'VENDEDOR',
        'Ah, bem-vindo! Esta loja guarda os projetos do Lucas. Quer dar uma olhada na vitrine?',
        ['Ver a vitrine', 'Agora não'],
      );
      if (escolha !== 0) return this.liberar();
    }
    if (coisa.acao === 'vendedor' || coisa.acao === 'vitrine') return this.abrirVitrine();
    if (coisa.acao.startsWith('experiencia:')) {
      const i = EXPERIENCIAS.findIndex((e) => e.id === coisa.acao.slice('experiencia:'.length));
      await cartao(EXPERIENCIAS as Item[], i, 'TRILHA DA CARREIRA', 'à trilha');
      return this.liberar();
    }
    if (coisa.acao === 'lote') {
      this.jogador.olharPara('cima');
      await dialogo('PRÓXIMO CAPÍTULO', 'Este espaço está esperando a próxima empresa.', ['Voltar à trilha']);
      return this.liberar();
    }
    this.liberar();
  }

  // O NPC olha para o Lucas e o Lucas olha para o NPC
  private virarPara(npc: Phaser.GameObjects.Sprite) {
    const j = this.jogador.sprite;
    const dx = j.x - npc.x;
    const dy = j.y - npc.y;
    const doNpc = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'esquerda' : 'direita') : dy < 0 ? 'cima' : 'baixo';
    const oposto = { esquerda: 'direita', direita: 'esquerda', cima: 'baixo', baixo: 'cima' } as const;
    npc.setFrame(LINHA[doNpc] * 4);
    this.jogador.olharPara(oposto[doNpc]);
  }

  private abrirVitrine() {
    this.cameras.main.fadeOut(150, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.launch('Vitrine');
      this.scene.pause();
      this.cameras.main.resetFX(); // ao voltar, a loja aparece sem o preto do fade
    });
  }

  update(_t: number, delta: number) {
    if (this.saindo || this.ocupado) return;
    this.jogador.atualizar(delta);
    const { x, y } = this.jogador.sprite;

    for (const p of this.dados.portas) {
      if (!dentro(p.area, x, y)) continue;
      if (p.modo === 'pisar' || p === this.portaAlvo) {
        this.jogador.olhando = p.olhandoPara ?? this.jogador.olhando;
        this.entrar(p);
        return;
      }
    }
    const alvo = this.interacaoAlvo;
    if (alvo && dentro(alvo.area, x, y)) {
      if (alvo.olhandoPara) this.jogador.olharPara(alvo.olhandoPara);
      this.interagir(alvo);
      return;
    }
    if (!this.jogador.andandoAteAlvo) {
      this.portaAlvo = null;
      this.interacaoAlvo = null;
    }

    const perto = this.portaParaTecla() ?? this.interacaoParaTecla();
    this.tecla.setVisible(!!perto);
    if (perto) this.tecla.setPosition(Math.round(x), Math.round(y) - 54);
  }
}
