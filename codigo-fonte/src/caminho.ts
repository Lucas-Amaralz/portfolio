// Caminho para o toque/clique: busca A* numa grade fina sobre o mundo, em 4 direções (como num RPG
// de grade), desviando dos bloqueios. Devolve só os pontos onde o caminho vira.

type Ponto = [number, number];
const PASSO = 4; // px do mundo por célula

export function acharCaminho(
  livre: (x: number, y: number) => boolean,
  de: Ponto,
  para: Ponto,
  largura: number,
  altura: number,
): Ponto[] | null {
  const cols = Math.ceil(largura / PASSO);
  const lins = Math.ceil(altura / PASSO);
  const celula = (x: number, y: number) => [Math.round(x / PASSO), Math.round(y / PASSO)] as const;
  const dentro = (c: number, l: number) => c >= 0 && l >= 0 && c < cols && l < lins;
  const memo = new Map<number, boolean>();
  const pode = (c: number, l: number) => {
    const k = l * cols + c;
    let v = memo.get(k);
    if (v === undefined) memo.set(k, (v = dentro(c, l) && livre(c * PASSO, l * PASSO)));
    return v;
  };

  const [c0, l0] = celula(...de);
  let [c1, l1] = celula(...para);
  let exato = livre(...para);
  // tocou num lugar onde não dá para pisar (parede, prédio): vai até a célula livre mais próxima
  if (!pode(c1, l1)) {
    exato = false;
    let achou = false;
    for (let r = 1; r <= 24 && !achou; r++) {
      let melhor: [number, number] | null = null;
      let dmin = Infinity;
      for (let dc = -r; dc <= r; dc++) {
        for (let dl = -r; dl <= r; dl++) {
          if (Math.max(Math.abs(dc), Math.abs(dl)) !== r || !pode(c1 + dc, l1 + dl)) continue;
          const d = dc * dc + dl * dl;
          if (d < dmin) [dmin, melhor] = [d, [c1 + dc, l1 + dl]];
        }
      }
      if (melhor) [c1, l1, achou] = [...melhor, true];
    }
    if (!achou) return null;
  }

  // A* com fila de prioridade simples (heap binário)
  const n = cols * lins;
  const g = new Float32Array(n).fill(Infinity);
  const veio = new Int32Array(n).fill(-1);
  const fechado = new Uint8Array(n);
  const heap: [number, number][] = []; // [f, índice]
  const subir = (i: number) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] <= heap[i][0]) break;
      [heap[p], heap[i]] = [heap[i], heap[p]];
      i = p;
    }
  };
  const descer = (i: number) => {
    for (;;) {
      const a = 2 * i + 1;
      const b = a + 1;
      let m = i;
      if (a < heap.length && heap[a][0] < heap[m][0]) m = a;
      if (b < heap.length && heap[b][0] < heap[m][0]) m = b;
      if (m === i) return;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  };
  const h = (c: number, l: number) => Math.abs(c - c1) + Math.abs(l - l1);
  const inicio = l0 * cols + c0;
  const fim = l1 * cols + c1;
  g[inicio] = 0;
  heap.push([h(c0, l0), inicio]);
  while (heap.length) {
    const [, atual] = heap[0];
    const ultimo = heap.pop()!;
    if (heap.length) {
      heap[0] = ultimo;
      descer(0);
    }
    if (fechado[atual]) continue;
    fechado[atual] = 1;
    if (atual === fim) break;
    const c = atual % cols;
    const l = (atual - c) / cols;
    for (const [dc, dl] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc;
      const nl = l + dl;
      // a célula de onde ele sai pode estar "encostada" num bloqueio; só as próximas precisam ser livres
      if (!pode(nc, nl)) continue;
      const k = nl * cols + nc;
      // virar custa um pouco: o caminho prefere linhas retas, como num jogo de grade
      const virou = veio[atual] >= 0 && veio[atual] !== atual - dc - dl * cols ? 0.5 : 0;
      const custo = g[atual] + 1 + virou;
      if (custo < g[k]) {
        g[k] = custo;
        veio[k] = atual;
        heap.push([custo + h(nc, nl), k]);
        subir(heap.length - 1);
      }
    }
  }
  if (!fechado[fim]) return null;

  // volta do fim ao começo e guarda só os pontos onde a direção muda
  const celulas: number[] = [];
  for (let k = fim; k !== -1; k = veio[k]) celulas.push(k);
  celulas.reverse();
  const pontos: Ponto[] = [];
  for (let i = 1; i < celulas.length; i++) {
    const proximo = celulas[i + 1];
    const reto = proximo !== undefined && proximo - celulas[i] === celulas[i] - celulas[i - 1];
    if (!reto) pontos.push([(celulas[i] % cols) * PASSO, Math.floor(celulas[i] / cols) * PASSO]);
  }
  if (exato) pontos.push(para);
  return pontos;
}
