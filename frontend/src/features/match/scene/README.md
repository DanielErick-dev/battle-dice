# scene: o mundo 3D da partida

Feito com **React Three Fiber**: Three.js escrito como componentes React (`<mesh>`, `<group>`…).
A cena só **lê** a `MatchView` (o que deve aparecer agora) e desenha. Ela nunca decide regra.

## Entrada

- `BoardScene.tsx`: o `<Canvas>`. Monta o ambiente, o tabuleiro, os bonecos e os efeitos.
- `CameraRig.tsx`: a câmera, com os três enquadramentos (perto, médio, tabuleiro) e o "olhar em volta".
- `PostEffects.tsx`: o pós-processamento (bloom, o brilho em volta das luzes).

## Pastas

| Pasta / arquivo | O que tem |
|---|---|
| `environment/` | Arena, oceano, céu, pedras, braseiros |
| `realm/` | Os corredores do céu e do inferno: paredes, portais, partículas |
| `character/` | Tudo de personagem: modelo animado (`CharacterModel`), asas, cadeiras, e os efeitos de cada habilidade e intro |
| `vfx/` | Efeitos feitos com a biblioteca wawa-vfx (partículas de cura) |
| `PlayerToken.tsx` | Um jogador no tabuleiro: o modelo, os clipes que tocam e as auras |
| `TileMesh.tsx`, `tileTheme.ts`, `useTileFaceTexture.ts` | As casas: forma, cor por tipo e texto pintado na face |
| `DiceThrow.tsx` | O dado 3D rolando |

## Boas práticas que seguimos aqui

- **Sem luzes reais nos efeitos.** Brilho é feito com material emissivo e bloom, porque cada luz extra pesa em todas as superfícies.
- **Shaders (GLSL):** depois de mexer num shader, conferir o console do navegador para ver se compilou. Uma vez, uma palavra reservada (`half`) deixou o oceano preto.
- **Escala nunca zero:** um objeto com escala 0 gera NaN e o bloom espalha uma tela preta. Use no mínimo 0.005.

Esta pasta é a próxima da fila de refatoração (etapa 4): os efeitos de cada personagem vão sair do `PlayerToken`/`BoardScene` para um registro, como fizemos em `ui/abilities/`.
