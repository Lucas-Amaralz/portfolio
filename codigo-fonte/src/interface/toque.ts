import './toque.css';

// Controles de celular: joystick no canto esquerdo e botão de ação (o mesmo que a tecla E) no direito.
// Só aparecem em telas de toque e só nas cenas em que o Lucas anda.

export const ehToque = matchMedia('(pointer: coarse)').matches;

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

// Aviso "gire o celular": aparece pelo CSS só em pé, em tela de toque, dentro das cenas
let aviso: HTMLElement | null = null;
export function emCena(sim: boolean) {
  if (!ehToque) return;
  if (!aviso) {
    aviso = document.createElement('div');
    aviso.className = 'girar';
    aviso.innerHTML =
      '<div class="celular" aria-hidden="true"></div><p>Gire o celular para jogar</p><small>O mapa e os painéis funcionam em pé</small>';
    document.body.append(aviso);
  }
  document.body.classList.toggle('em-cena', sim);
}
