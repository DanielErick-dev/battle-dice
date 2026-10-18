# scripts: preparar os modelos 3D

Scripts Node que pegam os arquivos baixados do Meshy e geram os GLBs leves que o jogo carrega (em `public/models/`). Não rodam no navegador nem no build: você roda na mão quando chega um modelo ou animação nova.

| Arquivo | O que faz |
|---|---|
| `characters/build-characters.mjs` | Junta o modelo e as animações de cada personagem num GLB comprimido |
| `characters/manifest.mjs` | Lista dos personagens, quais clipes cada um tem e as sequências montadas de partes |
| `props/build-props.mjs` | Encolhe os objetos estáticos (tronos, varinha, asas, caveira…) |

Como rodar, padrão de nomes e pastas: [docs/assets.md](../../docs/assets.md).
