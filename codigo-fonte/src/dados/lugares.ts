// Cada lugar da cidade é só dados: fundo, colisões, portas e quem está lá.
// Coordenadas escritas na grade de 768x512 (a arte de IA reduzida 2x); no fim do arquivo
// tudo é convertido para o mundo real, que usa a arte reduzida 3x (512x341), menos nos
// lugares com `escala: 1` (a Trilha usa a arte reduzida 2x, como na prévia aprovada).
// Retângulos são [x0, y0, x1, y1] e valem para os PÉS do Lucas: é ali que fica o corpo de colisão dele.

export type Direcao = 'baixo' | 'esquerda' | 'direita' | 'cima';
export type Ret = [number, number, number, number];

export interface Chegada {
  x: number;
  y: number;
  olhando: Direcao;
}

export interface Porta {
  area: Ret;
  destino: string;
  chegada: Chegada;
  // 'tecla': aperta E olhando para a porta; 'pisar': basta entrar na área
  modo: 'tecla' | 'pisar';
  olhandoPara?: Direcao;
  // sinal para quem não sabe que dá para passar: 'entrar' = balão "!", 'sair' = seta "SAIR" para baixo
  aviso?: 'entrar' | 'sair';
  avisoEm?: [number, number];
}

// Coisa com que o Lucas fala ou mexe (NPC, totem, placa): E dentro da área, ou tocar em `toque`
export interface Interacao {
  area: Ret; // onde os pés precisam estar
  toque: Ret; // onde a coisa aparece na tela (para o clique/toque)
  acao: string; // o que a cena faz: ver Lugar.interagir
  olhandoPara?: Direcao;
  aviso?: boolean; // mostra o balão "!" em cima, para avisar que dá para conversar
  avisoEm?: [number, number]; // onde fica o balão, quando não é em cima de `toque`
}

export interface Npc {
  textura: string;
  x: number;
  y: number; // linha dos pés
  olhando: Direcao;
}

// Nome escrito pelo código por cima da arte (a IA não escreve nomes reais)
export interface Placa {
  texto: string;
  x: number; // centro
  y: number;
  largura: number; // espaço disponível: o texto encolhe para caber
  cor: string;
  fundo?: string; // plaquinha escura atrás, quando a arte embaixo é clara
}

export interface Lugar {
  fundo: string;
  escala?: number; // grade 768 -> mundo; padrão 2/3
  cameraY?: number; // quanto a câmera fica acima do Lucas (no mundo); padrão 50
  largura: number;
  altura: number;
  bloqueios: Ret[];
  portas: Porta[];
  interacoes: Interacao[];
  npcs: Npc[];
  placas?: Placa[];
}

const frades = [25, 283, 527, 705].map((cx): Ret => [cx - 5, 288, cx + 5, 298]);

const LUGARES_768: Record<string, Lugar> = {
  'rua-projetos': {
    fundo: 'rua-projetos',
    largura: 768,
    altura: 512,
    bloqueios: [
      [0, 0, 768, 226], // fachadas
      [200, 0, 222, 232], [380, 0, 401, 232], [472, 0, 496, 232], // vasos na parede
      [124, 288, 146, 300], [618, 288, 640, 300], // postes
      [164, 270, 232, 294], // banco
      [84, 284, 114, 300], [654, 284, 688, 300], // floreiras
      ...frades,
      [0, 404, 768, 512], // telhados do outro lado da rua
    ],
    portas: [
      {
        area: [408, 226, 458, 246],
        destino: 'loja-projetos',
        chegada: { x: 385, y: 448, olhando: 'cima' },
        modo: 'tecla',
        olhandoPara: 'cima',
        aviso: 'entrar',
        avisoEm: [433, 144], // no alto da porta
      },
    ],
    interacoes: [],
    npcs: [],
  },

  'loja-projetos': {
    fundo: 'loja-projetos',
    largura: 768,
    altura: 512,
    bloqueios: [
      [0, 0, 768, 222], // parede do fundo e vitrine
      [505, 0, 686, 268], // balcão
      [470, 244, 486, 254], // vendedor
      [0, 0, 120, 240], [0, 240, 146, 348], [0, 348, 46, 512], // janela e armário
      [36, 340, 122, 440], // planta e caixa, até o armário (o vão atrás dela é estreito demais)
      [698, 230, 768, 512], // planta e caixas da direita
      [0, 440, 322, 512], [448, 440, 768, 512], // parede da frente
      [0, 494, 768, 512], // fim do corredor da saída
    ],
    portas: [
      {
        area: [330, 466, 440, 494],
        destino: 'rua-projetos',
        chegada: { x: 433, y: 254, olhando: 'baixo' },
        modo: 'pisar',
        aviso: 'sair',
        avisoEm: [384, 440], // logo acima do tapete da saída
      },
    ],
    interacoes: [
      // o vendedor oferece a vitrine; olhar direto para o balcão de vidro abre a vitrine sem conversa
      { area: [440, 236, 530, 292], toque: [454, 186, 504, 256], acao: 'vendedor', aviso: true },
      { area: [262, 222, 440, 254], toque: [262, 112, 492, 222], acao: 'vitrine', olhandoPara: 'cima' },
    ],
    // vendedor no chão, ao lado da vitrine, pronto para apresentá-la
    npcs: [{ textura: 'vendedor', x: 478, y: 252, olhando: 'baixo' }],
  },

  // Trilha da Carreira (bairro Experiência): um prédio por emprego, da esquerda para a direita
  trilha: {
    fundo: 'trilha',
    escala: 1,
    cameraY: 85, // mostra os prédios inteiros, com o Lucas no calçadão
    largura: 768,
    altura: 512,
    bloqueios: [
      [0, 0, 768, 262], // salgueiro, prédios e jardins
      [0, 262, 90, 300], // flores e caminho do arco
      [88, 262, 172, 307], // canteiro e banco da esquerda
      [199, 290, 233, 306], // totem da Prefeitura
      [258, 262, 358, 300], // canteiro do meio
      [416, 290, 450, 306], // totem da Zallpy
      [465, 262, 575, 307], // canteiro, mesa e banco da direita
      [575, 262, 768, 300], // lote em construção
      [35, 336, 50, 346], [311, 336, 326, 346], [625, 336, 640, 346], // postes
      [0, 346, 768, 512], // mureta e rio
    ],
    portas: [],
    interacoes: [
      // o totem ou o próprio prédio (no toque) abrem o cartão da experiência
      { area: [186, 280, 246, 326], toque: [134, 90, 296, 308], acao: 'experiencia:prefeitura', aviso: true, avisoEm: [216, 262] },
      { area: [403, 280, 463, 326], toque: [350, 104, 518, 308], acao: 'experiencia:zallpy', aviso: true, avisoEm: [433, 262] },
      { area: [590, 298, 740, 330], toque: [580, 170, 762, 300], acao: 'lote', olhandoPara: 'cima', aviso: true, avisoEm: [614, 220] },
    ],
    npcs: [],
    placas: [
      { texto: 'PREFEITURA', x: 217, y: 175, largura: 100, cor: '#ffc46b', fundo: '#1a1205' },
      { texto: 'ZALLPY', x: 435, y: 171, largura: 50, cor: '#d8ff9a' },
      { texto: 'PRÓXIMO\nCAPÍTULO', x: 614, y: 228, largura: 28, cor: '#ffe2b0' },
    ],
  },
};

// grade de 768x512 -> mundo de 512x341 (mesmo fator do preparar-arte.py)
const COORD = 2 / 3;

function converter(l: Lugar): Lugar {
  const k = l.escala ?? COORD;
  const c = (v: number) => Math.round(v * k);
  const ret = (r: Ret) => r.map(c) as Ret;
  return {
    ...l,
    largura: c(l.largura),
    altura: Math.floor(l.altura * k),
    bloqueios: l.bloqueios.map(ret),
    // a chegada de uma porta é no lugar de destino, então usa a escala de lá
    portas: l.portas.map((p) => {
      const kd = LUGARES_768[p.destino].escala ?? COORD;
      return { ...p, area: ret(p.area), avisoEm: p.avisoEm && [c(p.avisoEm[0]), c(p.avisoEm[1])], chegada: { ...p.chegada, x: Math.round(p.chegada.x * kd), y: Math.round(p.chegada.y * kd) } };
    }),
    interacoes: l.interacoes.map((i) => ({
      ...i,
      area: ret(i.area),
      toque: ret(i.toque),
      avisoEm: i.avisoEm && [c(i.avisoEm[0]), c(i.avisoEm[1])],
    })),
    npcs: l.npcs.map((n) => ({ ...n, x: c(n.x), y: c(n.y) })),
    placas: l.placas?.map((p) => ({ ...p, x: c(p.x), y: c(p.y), largura: c(p.largura) })),
  };
}

export const LUGARES: Record<string, Lugar> = Object.fromEntries(
  Object.entries(LUGARES_768).map(([nome, l]) => [nome, converter(l)]),
);

// onde o Lucas aparece ao chegar do mapa (já no mundo de cada lugar)
export const CHEGADA_INICIAL: Chegada = { x: Math.round(330 * COORD), y: Math.round(340 * COORD), olhando: 'cima' };
export const CHEGADA_TRILHA: Chegada = { x: 70, y: 322, olhando: 'direita' };
