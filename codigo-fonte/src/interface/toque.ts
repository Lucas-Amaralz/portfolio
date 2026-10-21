import './toque.css';

// Celular. Deitado: joystick e botão de ação (o mesmo que a tecla E) por cima da cena.
// Em pé: o jogo fica na parte de cima e os controles numa área própria embaixo, como num Game Boy;
// essa área muda conforme a tela: bairros no mapa, joystick nas cenas, setas na vitrine.

export const ehToque = matchMedia('(pointer: coarse)').matches;

// celular em pé: o CSS divide a tela (body.em-pe) e as cenas escolhem o zoom por isso
export const emPe = () => ehToque && window.innerHeight > window.innerWidth;
function marcarPosicao() {
  document.body.classList.toggle('em-pe', emPe());
}
if (ehToque) {
  marcarPosicao();
  window.addEventListener('resize', marcarPosicao);
}

// direção do joystick, de -1 a 1 em cada eixo (0, 0 = solto)
export const joystick = { x: 0, y: 0 };

const RAIO = 44; // px de CSS que o pino anda a partir do centro
let controles: HTMLElement | null = null;

function criar() {
  const caixa = document.createElement('div');
  caixa.className = 'toque-controles';
  caixa.innerHTML =
    '<div class="joystick" aria-hidden="true"><div class="pino"></div></div>' +
    '<button type="button" class="acao" aria-label="Interagir">E</button>';
  document.body.append(caixa);

  const base = caixa.querySelector<HTMLElement>('.joystick')!;
  const pino = caixa.querySelector<HTMLElement>('.pino')!;
  let dedo: number | null = null;

  const mover = (ev: PointerEvent) => {
    const r = base.getBoundingClientRect();
    let dx = ev.clientX - (r.left + r.width / 2);
    let dy = ev.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > RAIO) {
      dx = (dx / d) * RAIO;
      dy = (dy / d) * RAIO;
    }
    pino.style.translate = `${dx}px ${dy}px`;
    // zona morta pequena no centro para o Lucas não andar sozinho
    const forca = Math.min(d, RAIO) / RAIO;
    joystick.x = forca > 0.25 ? dx / RAIO : 0;
    joystick.y = forca > 0.25 ? dy / RAIO : 0;
  };
  const soltar = () => {
    dedo = null;
    joystick.x = joystick.y = 0;
    pino.style.translate = '';
  };
  base.addEventListener('pointerdown', (ev) => {
    dedo = ev.pointerId;
    base.setPointerCapture(ev.pointerId);
    mover(ev);
  });
  base.addEventListener('pointermove', (ev) => ev.pointerId === dedo && mover(ev));
  base.addEventListener('pointerup', soltar);
  base.addEventListener('pointercancel', soltar);

  caixa.querySelector('.acao')!.addEventListener('click', () => window.dispatchEvent(new Event('acao-toque')));
  return caixa;
}

export function mostrarControles(ligar: boolean) {
  if (!ehToque) return;
  controles ??= criar();
  controles.hidden = !ligar;
  if (!ligar) joystick.x = joystick.y = 0;
}

// ---------- Área de baixo (só em pé) ----------

let area: HTMLElement | null = null;

// Troca o que aparece na área de baixo; `botoes` são [texto, ação, classe extra]
export function areaDeBaixo(titulo: string, botoes: [string, () => void, string?][] = []) {
  if (!ehToque) return;
  if (!area) {
    area = document.createElement('div');
    area.className = 'area-baixo';
    document.body.append(area);
  }
  area.replaceChildren();
  if (titulo) {
    const t = document.createElement('div');
    t.className = 'area-titulo';
    t.textContent = titulo;
    area.append(t);
  }
  if (!botoes.length) return;
  const grade = document.createElement('div');
  grade.className = botoes.length === 3 ? 'area-botoes tres' : 'area-botoes';
  for (const [texto, acao, classe] of botoes) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = texto;
    if (classe) b.className = classe;
    b.onclick = acao;
    grade.append(b);
  }
  area.append(grade);
}
