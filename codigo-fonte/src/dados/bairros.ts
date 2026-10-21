// Bairros do mapa da cidade. Coordenadas escritas na grade de 1536x1024 do mapa-novo-bruto.png
// (fácil de conferir na imagem original); no fim do arquivo viram o mundo de 512x341.
import { CHEGADA_INICIAL, CHEGADA_TRILHA, type Chegada, type Ret } from './lugares';
import type { TipoPainel } from '../interface/paineis';

type Ponto = [number, number];

export interface Bairro {
  nome: string; // texto da placa
  area: Ret; // parte do mapa que acende e recebe o clique
  placa: Ponto; // centro da placa com o nome
  // caminho do pino pelas ruas, a partir do cruzamento ao norte da praça
  rota: Ponto[];
  // para onde o clique leva: um lugar andável ou um painel; sem nenhum, mostra a "Expansão futura"
  destino?: { lugar: string; chegada: Chegada };
  painel?: TipoPainel;
}

// todas as rotas começam aqui: o pino volta até o cruzamento e segue a rota do bairro novo
const CRUZAMENTO: Ponto = [780, 400];

const BAIRROS_1536: Record<string, Bairro> = {
  certificacoes: {
    nome: 'Certificações',
    area: [30, 30, 175, 168], // o farol
    placa: [150, 196], // para dentro do mapa: no canto, o dedo não alcançava
    rota: [CRUZAMENTO, [160, 400], [160, 200]],
    painel: 'certificacoes',
  },
  projetos: {
    nome: 'Projetos',
    area: [180, 170, 640, 370],
    placa: [410, 135],
    rota: [CRUZAMENTO, [410, 400]],
    destino: { lugar: 'rua-projetos', chegada: CHEGADA_INICIAL },
  },
  curriculo: {
    nome: 'Currículo',
    area: [1050, 20, 1190, 345], // a torre do telão
    placa: [1090, 84], // para dentro do mapa e abaixo dos botões fixos: no canto, o dedo não alcançava
    rota: [CRUZAMENTO, [980, 400], [1120, 400]],
    painel: 'curriculo',
  },
  praca: {
    nome: 'Praça Central',
    area: [600, 385, 960, 620],
    placa: [780, 640],
    rota: [CRUZAMENTO, [700, 400], [700, 470]],
  },
  experiencia: {
    nome: 'Experiência',
    area: [60, 430, 600, 860], // o parque
    placa: [260, 440],
    rota: [CRUZAMENTO, [590, 400], [590, 640], [470, 640]],
    destino: { lugar: 'trilha', chegada: CHEGADA_TRILHA },
  },
  contato: {
    nome: 'Contato',
    area: [1000, 400, 1300, 760], // a torre de rádio
    placa: [1150, 775],
    rota: [CRUZAMENTO, [980, 400], [980, 640], [1060, 640]],
    painel: 'contato',
  },
};

// o Lucas começa na praça
export const BAIRRO_INICIAL = 'praca';

// grade de 1536x1024 -> mundo de 512x341 (a chegada já vem convertida de lugares.ts)
const c = (v: number) => Math.round(v / 3);
const ponto = (p: Ponto): Ponto => [c(p[0]), c(p[1])];

export const BAIRROS: Record<string, Bairro> = Object.fromEntries(
  Object.entries(BAIRROS_1536).map(([id, b]) => [
    id,
    { ...b, area: b.area.map(c) as Ret, placa: ponto(b.placa), rota: b.rota.map(ponto) },
  ]),
);
