# The City: jogo

Portfólio jogável em Phaser 3 + TypeScript + Vite. Etapa 1: a rua da loja de Projetos e o interior da loja.

## Rodar

O Node.js está em `C:\Program Files\nodejs`. Se `npm` não for encontrado no terminal, rode antes:
`$env:Path = "C:\Program Files\nodejs;" + $env:Path`

```
npm install
npm run dev        # abre em http://localhost:5173
npm run build      # gera a pasta dist/ para publicar
```

- `?debug` na URL mostra as caixas de colisão.
- Controles: WASD ou setas para andar, E na porta para entrar ou para falar com o vendedor, tocar ou clicar na tela para andar até o ponto (tocar na porta ou no vendedor também usa).
- Na vitrine: ← → escolhem, E/Enter abre o cartão, ESC volta (cartão → vitrine → loja).

## Onde fica cada coisa

| Arquivo | O que é |
|---|---|
| `src/dados/lugares.ts` | Cada lugar como dados: fundo, colisões, portas e NPCs |
| `src/cenas/Lugar.ts` | A cena única que monta qualquer lugar a partir dos dados |
| `src/cenas/Vitrine.ts` | Vitrine da loja de Projetos: objetos na prateleira, etiquetas e cartões |
| `src/dados/projetos.json` | Textos dos projetos (copiados do currículo e do painel aprovado) |
| `src/interface/` | Diálogo, cartão (popup) e dica em HTML por cima do jogo |
| `src/jogador.ts` | Movimento, animação e andar até o ponto tocado |
| `ferramentas/preparar-arte.py` | Reduz a arte de IA 2x, recolore o vendedor e recorta as camadas de profundidade |
| `public/arte/` | Arte gerada pelo script (não editar à mão) |

## Adicionar um lugar

1. Coloque a imagem de 1536x1024 na pasta `portfolio-cidade/` e adicione uma linha `reduzir(...)` em `preparar-arte.py`.
2. Se algum objeto deve ficar na frente do Lucas, adicione-o em `CAMADAS` no mesmo script.
3. Rode `npm run assets`.
4. Em `lugares.ts`, crie a entrada com os bloqueios (retângulos para os pés) e as portas. Para ajustar, use `?debug`.
