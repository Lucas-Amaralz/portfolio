import './abertura.css';
import { capturarTeclas, el } from './interface';
import { abrirResumo } from './paineis';
import { ehToque } from './toque';

// Abertura: o Lucas, de costas, olhando a cidade, se apresenta numa caixa de diálogo (toque passa a fala)
// e no fim pergunta se a pessoa quer jogar ou só ver o currículo e os projetos.
// Quem já viu a apresentação neste navegador vai direto para a pergunta.

const CHAVE = 'abertura-vista';

const FALAS = [
  'Olá! Eu sou o Lucas, Analista de Infraestrutura Júnior.',
  'Quero te apresentar meu projeto pessoal: um portfólio que você pode jogar, numa cidade em que cada bairro guarda uma parte da minha carreira.',
  ehToque
    ? 'Para a melhor experiência no jogo, deite o celular.'
    : 'Para a melhor experiência, ande com WASD ou as setas e use E para interagir.',
];
const PERGUNTA = 'Deseja jogar e se aventurar pela cidade?';

function jaViu() {
  try {
    return localStorage.getItem(CHAVE) === '1';
  } catch {
    return false;
  }
}

function marcarVista() {
  try {
    localStorage.setItem(CHAVE, '1');
  } catch {
    // sem armazenamento: a apresentação aparece de novo na próxima visita
  }
}

// Mostra a abertura; resolve quando a pessoa escolhe JOGAR (o "só ver" volta para a pergunta ao fechar)
export async function abertura() {
  document.body.classList.add('com-menu'); // esconde os botões fixos enquanto a abertura está na tela
  for (;;) {
    const escolha = await mostrar(jaViu());
    marcarVista();
    if (escolha === 'jogar') break;
    await abrirResumo();
  }
  document.body.classList.remove('com-menu');
}

function mostrar(pularFalas: boolean) {
  return new Promise<'jogar' | 'ver'>((resolver) => {
    const tela = el('div', 'ui abertura');
    tela.setAttribute('role', 'dialog');
    tela.setAttribute('aria-label', 'Apresentação');
    // a cidade preenche a tela inteira em qualquer formato (caminho relativo, por isso aqui e não no CSS)
    tela.style.setProperty('--cidade', 'url(arte/mapa.png)');

    const pular = el('button', 'abertura-pular', 'Pular');
    pular.type = 'button';

    const caixa = el('div', 'abertura-caixa');
    const fala = el('p', 'abertura-fala');
    fala.setAttribute('aria-live', 'polite');
    const seta = el('span', 'abertura-seta', '▼');
    seta.setAttribute('aria-hidden', 'true');
    const opcoes = el('div', 'abertura-opcoes');
    const jogar = el('button', 'abertura-botao principal', '▶ Jogar');
    const ver = el('button', 'abertura-botao', 'Apenas ver o currículo e os projetos');
    for (const b of [jogar, ver]) b.type = 'button';
    opcoes.append(jogar, ver);
    opcoes.hidden = true;
    caixa.append(el('div', 'abertura-quem', 'Lucas'), fala, opcoes, seta);

    // o Lucas de costas (quadro "cima" do sprite), olhando a cidade
    const lucas = el('div', 'abertura-lucas');
    lucas.setAttribute('aria-hidden', 'true');
    lucas.style.backgroundImage = 'url(arte/lucas.png)';

    tela.append(pular, caixa, lucas);
    document.body.append(tela);

    const falas = pularFalas ? [PERGUNTA] : [...FALAS, PERGUNTA];
    const reduzir = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let n = 0;
    let letras = 0;
    let relogio = 0;
    const texto = () => falas[n];
    const completa = () => letras >= texto().length;

    // texto letra por letra, como os diálogos dentro do jogo
    function escrever() {
      clearInterval(relogio);
      letras = 0;
      seta.hidden = true;
      relogio = window.setInterval(() => {
        letras = reduzir ? texto().length : letras + 2;
        fala.textContent = texto().slice(0, letras);
        if (completa()) terminarFala();
      }, 16);
    }

    function terminarFala() {
      clearInterval(relogio);
      letras = texto().length;
      fala.textContent = texto();
      const ultima = n === falas.length - 1;
      seta.hidden = ultima;
      if (ultima) mostrarOpcoes();
    }

    function mostrarOpcoes() {
      opcoes.hidden = false;
      pular.hidden = true;
      jogar.focus({ preventScroll: true });
    }

    // toque ou clique em qualquer lugar (menos nos botões): completa a fala ou passa para a próxima
    function avancar() {
      if (!completa()) return terminarFala();
      if (n < falas.length - 1) {
        n++;
        escrever();
      }
    }
    tela.addEventListener('click', (ev) => {
      if ((ev.target as HTMLElement).closest('button')) return;
      avancar();
    });
    pular.onclick = () => {
      n = falas.length - 1;
      terminarFala();
    };
    jogar.onclick = () => escolher('jogar');
    ver.onclick = () => escolher('ver');

    const soltar = capturarTeclas((ev) => {
      const k = ev.key.toLowerCase();
      const comOpcoes = !opcoes.hidden;
      if (comOpcoes && ['arrowup', 'arrowdown', 'w', 's', 'tab'].includes(k)) {
        ev.preventDefault();
        (document.activeElement === jogar ? ver : jogar).focus();
        return;
      }
      if (['enter', ' ', 'e'].includes(k)) {
        ev.preventDefault();
        if (comOpcoes) escolher(document.activeElement === ver ? 'ver' : 'jogar');
        else avancar();
      }
      if (k === 'escape' && !comOpcoes) pular.click();
    });

    function escolher(o: 'jogar' | 'ver') {
      clearInterval(relogio);
      soltar();
      tela.remove();
      resolver(o);
    }

    escrever();
  });
}
