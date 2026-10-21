"""Prepara a arte do jogo a partir das imagens aprovadas na pasta portfolio-cidade.

- Cenas de IA (1536x1024) -> 768x512 por vizinho mais próximo (fator 2, sem reduzir cores).
- Sprite do Lucas copiado como está (4x4 quadros de 48px).
- Vendedor = sprite do Lucas recolorido (cabelo grisalho, moletom âmbar).

Rodar de dentro de jogo/:  python ferramentas/preparar-arte.py
"""
import colorsys
from pathlib import Path
from PIL import Image

RAIZ = Path(__file__).resolve().parents[2]
SAIDA = RAIZ / 'jogo' / 'public' / 'arte'
SAIDA.mkdir(parents=True, exist_ok=True)


# A arte de IA (1536x1024) é reduzida 3x: o mundo fica 512x341 e o Lucas (48px)
# fica na proporção certa com portas e móveis. As coordenadas em CAMADAS continuam
# escritas na grade antiga de 768x512 e são convertidas por COORD.
REDUCAO = 3
COORD = 2 / REDUCAO


def reduzir(nome_origem, nome_saida, reducao=REDUCAO):
    img = Image.open(RAIZ / nome_origem).convert('RGBA')
    img = img.resize((img.width // reducao, img.height // reducao), Image.NEAREST)
    img.save(SAIDA / nome_saida)


def recolorir_vendedor():
    img = Image.open(RAIZ / 'sprites' / 'lucas-sprites-48.png').convert('RGBA')
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            if 0.40 < h < 0.60 and s > 0.15:
                # moletom verde-azulado -> âmbar
                nr, ng, nb = colorsys.hls_to_rgb(0.10, min(l * 1.5, 0.75), 0.75)
            elif l < 0.25 and s < 0.35 and y % 48 < 24:
                # cabelo escuro (metade de cima do quadro) -> grisalho
                v = 0.35 + l * 1.6
                nr = ng = nb = v
            else:
                continue
            px[x, y] = (int(nr * 255), int(ng * 255), int(nb * 255), a)
    img.save(SAIDA / 'vendedor.png')


# Objetos que ficam NA FRENTE do Lucas quando ele está atrás deles.
# Cada um: cena, nome, formas (retângulos x0,y0,x1,y1 em coordenadas do mundo 768x512)
# e a linha da base (profundidade). Por padrão o fundo dentro dos retângulos sai por
# preenchimento a partir das bordas, que para no contorno escuro do objeto; 'ret'
# usa os retângulos como estão (para objetos com contorno falho).
CAMADAS = {
    'rua-projetos': [
        # 'auto' recorta pelo fundo; a lista seguinte são núcleos (x0,y0,x1,y1) sempre opacos
        ('poste-esq', [(120, 158, 151, 302)], 299, 'auto', [(126, 166, 146, 186), (132, 186, 140, 300)]),
        ('poste-dir', [(614, 158, 645, 302)], 299, 'auto', [(620, 166, 640, 186), (626, 186, 634, 300)]),
        ('banco', [(162, 246, 234, 296)], 294),
        ('vaso-esq', [(78, 244, 120, 302)], 300, 'auto'),
        ('vaso-dir', [(646, 232, 694, 302)], 300, 'auto'),
        ('frade-1', [(18, 262, 33, 300)], 298),
        ('frade-2', [(276, 262, 291, 300)], 298),
        ('frade-3', [(520, 262, 535, 300)], 298),
        ('frade-4', [(698, 262, 713, 300)], 298),
    ],
    'loja-projetos': [
        ('planta-esq', [(24, 336, 122, 436), (45, 318, 122, 336)], 432, 'auto', [(44, 394, 80, 432), (80, 388, 116, 432)]),
        ('planta-dir', [(694, 240, 750, 444)], 440, 'auto'),
    ],
    # a Trilha da Carreira é reduzida só 2x (como na prévia aprovada): grade 768 = mundo
    'trilha': [
        ('poste-1', [(28, 256, 56, 352)], 348, 'auto', [(34, 262, 50, 290), (39, 290, 46, 348)]),
        ('poste-2', [(304, 256, 334, 352)], 348, 'auto', [(310, 262, 328, 290), (315, 290, 322, 348)]),
        ('poste-3', [(618, 256, 646, 352)], 348, 'auto', [(624, 262, 640, 290), (629, 290, 636, 348)]),
        ('totem-prefeitura', [(198, 264, 234, 308)], 306, 'auto', [(202, 270, 230, 304)]),
        ('totem-zallpy', [(415, 264, 451, 308)], 306, 'auto', [(419, 270, 447, 304)]),
    ],
}
COORD_CENA = {'trilha': 1}

# Objetos da vitrine: recortados da arte antiga de uma prateleira só (vitrine-limpa.png, na grade 768)
# e salvos como objeto-<id>.png, reduzidos 4x (em vez de 3x) para caberem 4 por prateleira.
# O pixel continua do tamanho do mundo; o objeto só tem menos detalhe. A base não importa.
OBJETOS = {
    'vitrine': [
        ('dps', [(146, 214, 270, 308)], 999, 'auto', [(152, 222, 262, 300)]),
        ('automacao', [(322, 196, 442, 312)], 999, 'auto', [(328, 200, 436, 306)]),
        ('portfolio', [(494, 174, 658, 312)], 999, 'frio'),
    ],
}
ESCURO = 40  # luminância do contorno


def apagar_pontinhos(m, minimo):
    """Tira grupos soltos com menos de `minimo` pixels."""
    import numpy as np
    from collections import deque
    visto = np.zeros_like(m)
    h, w = m.shape
    for j0, i0 in zip(*np.nonzero(m)):
        if visto[j0, i0]:
            continue
        grupo, fila = [], deque([(j0, i0)])
        visto[j0, i0] = True
        while fila:
            j, i = fila.popleft()
            grupo.append((j, i))
            for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                b, a = j + dj, i + di
                if 0 <= a < w and 0 <= b < h and m[b, a] and not visto[b, a]:
                    visto[b, a] = True
                    fila.append((b, a))
        if len(grupo) < minimo:
            for j, i in grupo:
                m[j, i] = False
    return m


def fechar_furos(m):
    """Fecha furos de 1 a 2 px: dilata e depois erode 1 px (3x3)."""
    import numpy as np

    def vizinhos(x, op):
        p = np.pad(x, 1, constant_values=(op is np.logical_and))
        r = p[1:-1, 1:-1].copy()
        for dj in (-1, 0, 1):
            for di in (-1, 0, 1):
                r = op(r, p[1 + dj:p.shape[0] - 1 + dj, 1 + di:p.shape[1] - 1 + di])
        return r

    return vizinhos(vizinhos(m, np.logical_or), np.logical_and) | m


def recortar_pelo_fundo(img, cena, nome, formas, base, nucleo=(), folga=6, limite=26, coord=COORD):
    """Recorta o objeto tirando o que se parece com o fundo ao redor dele.

    As cores do fundo de cada linha vêm de `folga` px à esquerda e à direita do objeto,
    na mesma linha (chão e tijolos mudam pouco ao longo de uma linha). A partir das
    bordas, apaga os pixels parecidos com essas cores (distância < limite). Abaixo da
    linha de colisão (base - 8) o recorte não importa, porque o Lucas nunca fica ali,
    então mantém tudo e o objeto não ganha buracos.
    """
    import numpy as np
    from collections import deque
    arr = np.array(img).astype(int)
    x0 = min(f[0] for f in formas); y0 = min(f[1] for f in formas)
    x1 = max(f[2] for f in formas); y1 = max(f[3] for f in formas)
    bloco = arr[y0:y1, x0:x1, :3]
    h, w = bloco.shape[:2]
    lados = np.concatenate([arr[y0:y1, max(x0 - folga, 0):x0, :3], arr[y0:y1, x1:x1 + folga, :3]], axis=1)
    # distância de cada pixel até a cor mais próxima do fundo na mesma linha
    dist = np.sqrt(((bloco[:, :, None, :] - lados[:, None, :, :]) ** 2).sum(-1)).min(-1)
    parecido = dist < limite
    dentro = np.zeros((h, w), bool)
    for f in formas:
        dentro[f[1] - y0:f[3] - y0, f[0] - x0:f[2] - x0] = True

    fundo = ~dentro
    fila = deque(zip(*np.nonzero(fundo)))
    for j in range(h):
        for i in range(w):
            if (i in (0, w - 1) or j in (0, h - 1)) and parecido[j, i] and not fundo[j, i]:
                fundo[j, i] = True
                fila.append((j, i))
    while fila:
        j, i = fila.popleft()
        for dj, di in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            b, a = j + dj, i + di
            if 0 <= a < w and 0 <= b < h and not fundo[b, a] and parecido[b, a]:
                fundo[b, a] = True
                fila.append((b, a))

    mascara = dentro & ~fundo
    mascara = fechar_furos(apagar_pontinhos(mascara, 6))
    for n in nucleo:  # partes marcadas à mão que são sempre objeto
        n = [round(v * coord) for v in n]
        mascara[n[1] - y0:n[3] - y0, n[0] - x0:n[2] - x0] = True
    mascara &= dentro
    corte = base - 8 - y0
    mascara[max(corte, 0):, :] |= dentro[max(corte, 0):, :]
    crop = img.crop((x0, y0, x1, y1))
    alpha = Image.fromarray((mascara * 255).astype('uint8'))
    crop.putalpha(alpha)
    crop.save(SAIDA / f'{cena}-{nome}.png')
    return {'chave': f'{cena}-{nome}', 'x': x0, 'y': y0, 'base': base}


def recortar_frio(img, cena, nome, r, base):
    """Para objetos de neon frio (roxo/azul) na frente de parede quente: apaga os tons quentes."""
    crop = img.crop(r)
    px = crop.load()
    for j in range(crop.height):
        for i in range(crop.width):
            cr, cg, cb, _ = px[i, j]
            h, l, s = colorsys.rgb_to_hls(cr / 255, cg / 255, cb / 255)
            quente = (h < 0.2 or h > 0.97) and s > 0.12 and l > 0.12
            parede = l < 0.22 and s < 0.3  # cinza escuro da parede e da estante
            if quente or parede:
                px[i, j] = (0, 0, 0, 0)
    import numpy as np
    m = fechar_furos(apagar_pontinhos(np.array(crop)[:, :, 3] > 0, 40))
    crop.putalpha(Image.fromarray((m * 255).astype('uint8')))
    crop.save(SAIDA / f'{cena}-{nome}.png')
    return {'chave': f'{cena}-{nome}', 'x': r[0], 'y': r[1], 'base': base}


def recortar_camadas(cena, specs, img=None):
    from collections import deque
    img = img or Image.open(SAIDA / f'{cena}.png').convert('RGBA')
    coord = COORD_CENA.get(cena, COORD)
    info = []
    for nome, formas, base, *modo in specs:
        formas = [tuple(round(v * coord) for v in f) for f in formas]
        base = round(base * coord)
        if modo == ['frio']:
            info.append(recortar_frio(img, cena, nome, formas[0], base))
            continue
        if modo and modo[0] == 'auto':
            info.append(recortar_pelo_fundo(img, cena, nome, formas, base, *modo[1:], coord=coord))
            continue
        x0 = min(f[0] for f in formas); y0 = min(f[1] for f in formas)
        x1 = max(f[2] for f in formas); y1 = max(f[3] for f in formas)
        crop = img.crop((x0, y0, x1, y1))
        w, h = crop.size
        px = crop.load()
        dentro = [[any(f[0] <= x0 + i < f[2] and f[1] <= y0 + j < f[3] for f in formas)
                   for i in range(w)] for j in range(h)]
        if modo == ['ret']:
            fundo = [[not dentro[j][i] for i in range(w)] for j in range(h)]
        else:
            lum = lambda p: 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]
            fundo = [[False] * w for _ in range(h)]
            fila = deque()
            for j in range(h):
                for i in range(w):
                    borda = i in (0, w - 1) or j in (0, h - 1)
                    if (not dentro[j][i]) or (borda and lum(px[i, j]) > ESCURO):
                        fundo[j][i] = True
                        fila.append((i, j))
            while fila:
                i, j = fila.popleft()
                for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    a, b = i + di, j + dj
                    if 0 <= a < w and 0 <= b < h and not fundo[b][a] and lum(px[a, b]) > ESCURO:
                        fundo[b][a] = True
                        fila.append((a, b))
        for j in range(h):
            for i in range(w):
                if fundo[j][i]:
                    px[i, j] = (0, 0, 0, 0)
        crop.save(SAIDA / f'{cena}-{nome}.png')
        info.append({'chave': f'{cena}-{nome}', 'x': x0, 'y': y0, 'base': base})
    return info


def criar_pino():
    # Pino do mapa: rosto do Lucas (quadro de frente) numa plaquinha com ponta embaixo
    rosto = Image.open(RAIZ / 'sprites' / 'lucas-sprites-48.png').convert('RGBA').crop((12, 4, 36, 28))
    pino = Image.new('RGBA', (30, 35), (0, 0, 0, 0))
    px = pino.load()
    borda, fundo = (255, 196, 107, 255), (26, 18, 5, 255)
    for y in range(30):
        for x in range(30):
            canto = (x in (0, 29)) and (y in (0, 29))
            if not canto:
                px[x, y] = borda if x in (0, 29) or y in (0, 29) else fundo
    for i in range(5):  # ponta
        for x in range(15 - (4 - i), 15 + (4 - i)):
            px[x, 30 + i] = borda
    pino.alpha_composite(rosto, (3, 4))
    pino.save(SAIDA / 'pino.png')
    rosto.save(SAIDA / 'rosto.png')  # foto do telão do Currículo


reduzir('mapa-novo-bruto.png', 'mapa.png')
criar_pino()
reduzir('loja-projetos-fora.png', 'rua-projetos.png')
reduzir('loja-projetos-dentro.png', 'loja-projetos.png')
reduzir('vitrine-2prateleiras-bruto.png', 'vitrine.png')
reduzir('conceito-experiencia-v2.png', 'trilha.png', 2)


def centralizar_placa_zallpy():
    """Move a caixa verde do nome da Zallpy para o meio da fachada (pedido dele) e refaz a fachada
    onde ela estava: a faixa azul continua na diagonal e o verde vem do brilho de cima e de baixo."""
    img = Image.open(SAIDA / 'trilha.png').convert('RGBA')
    x0, y0, x1, y1 = 450, 156, 510, 186  # caixa com o contorno amarelo
    caixa = img.crop((x0, y0, x1, y1))
    px = img.load()
    azul = lambda c: c[2] > c[0] + 30
    for y in range(y0, y1):
        for x in range(x0, x1):
            # a faixa azul é igual ao longo da diagonal (sobe para a direita): pega a cor logo fora da caixa
            k = x - (x0 - 1)
            ref = px[x0 - 1, y + k] if y + k < 190 else None
            if ref and azul(ref):
                px[x, y] = ref
                continue
            cima, baixo = px[x, y0 - 1], px[x, y1]
            if azul(cima):
                cima = baixo
            t = (y - y0 + 1) / (y1 - y0 + 1)
            px[x, y] = tuple(round(cima[i] * (1 - t) + baixo[i] * t) for i in range(4))
    img.paste(caixa, (405, y0))  # centro da fachada (353 a 516)
    img.save(SAIDA / 'trilha.png')


centralizar_placa_zallpy()
# imagem de cada prédio para o cartão da experiência (recorte da própria cena, na grade 768)
trilha = Image.open(SAIDA / 'trilha.png')
trilha.crop((134, 64, 298, 268)).save(SAIDA / 'predio-prefeitura.png')
trilha.crop((350, 104, 518, 276)).save(SAIDA / 'predio-zallpy.png')
Image.open(RAIZ / 'sprites' / 'lucas-sprites-48.png').save(SAIDA / 'lucas.png')
recolorir_vendedor()
import json
camadas = {cena: recortar_camadas(cena, specs) for cena, specs in CAMADAS.items()}
(SAIDA / 'camadas.json').write_text(json.dumps(camadas, indent=2), encoding='utf-8')
print('arte pronta em', SAIDA)


def criar_objetos():
    """Recorta cada objeto na arte antiga reduzida 3x (para usar a máscara) e refaz a redução em 4x."""
    original = Image.open(RAIZ / 'vitrine-limpa.png').convert('RGBA')
    velha = original.resize((original.width // 3, original.height // 3), Image.NEAREST)
    for info in recortar_camadas('vitrine', OBJETOS['vitrine'], velha):
        corte_path = SAIDA / f"{info['chave']}.png"
        corte = Image.open(corte_path)
        x, y = info['x'] * 3, info['y'] * 3
        crop = original.crop((x, y, x + corte.width * 3, y + corte.height * 3))
        crop.putalpha(corte.split()[3].resize(crop.size, Image.NEAREST))
        corte.close()
        corte_path.unlink()
        nome = info['chave'].replace('vitrine-', 'objeto-')
        crop.resize((crop.width // 4, crop.height // 4), Image.NEAREST).save(SAIDA / f'{nome}.png')


criar_objetos()
print('objetos prontos')


def criar_objeto_avulso(origem, nome, fator=10):
    """Objeto de vitrine gerado sozinho num fundo magenta (#FF00FF): tira o magenta, corta e reduz."""
    import numpy as np
    img = Image.open(RAIZ / origem).convert('RGBA')
    a = np.array(img)
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    magenta = (r > 150) & (b > 150) & (g < 110) & (abs(r - b) < 70)
    a[magenta, 3] = 0
    img = Image.fromarray(a)
    img = img.crop(img.getbbox())
    img = img.resize((img.width // fator, img.height // fator), Image.NEAREST)
    # restos roxos da borda do magenta (o objeto não tem roxo)
    a = np.array(img)
    r, g, b = (a[:, :, i].astype(int) for i in range(3))
    a[(r > 90) & (b > 90) & (g < r - 40) & (g < b - 40), 3] = 0
    img = Image.fromarray(a)
    img.save(SAIDA / f'objeto-{nome}.png')


criar_objeto_avulso('objeto-ultima-bruto.png', 'ultima')
print('objeto da Última Luz pronto')
