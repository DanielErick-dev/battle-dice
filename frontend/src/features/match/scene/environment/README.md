# scene/environment: o mundo em volta da trilha

Tudo o que fica em volta do tabuleiro, por mapa (`features/shared/presets/maps.ts`): a ilha no mar à noite, o salão da masmorra ou a cidade em ruínas.
Nada aqui decide regra: só desenha a partir da trilha (`layout.trail`).

## Entrada

`ArenaEnvironment.tsx` escolhe o mapa e exporta `HORIZON_COLOR` (a cor do horizonte, usada no fundo e na névoa da `BoardScene`).

## Pastas

| Pasta        | O que tem                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `island/`    | A ilha. `IslandWorld.tsx` junta céu, estrelas, partículas dos reinos, oceano e a ilha (`Island.tsx`). O resto está abaixo                        |
| `sky/`       | `SkyDome.tsx` (o céu nublado com a lua, que vira céu de fogo ou dia claro nos reinos; shader em `skyShader.ts`) e `NightStars.tsx`               |
| `ocean/`     | `Ocean.tsx`: o mar animado (ondas, reflexo, brilho da lua, espuma na costa); shader em `oceanShader.ts`                                          |
| `dungeon/`   | A masmorra: `Dungeon.tsx` (o salão), `plan.ts` (onde vai cada parede, tocha e móvel) e `textures.ts` (piso e estrada pintados)                   |
| `wasteland/` | A terra devastada: `Wasteland.tsx`, `plan.ts` (ruínas, carros, entulho, fogueiras), `catalog.ts` (tamanho e escala de cada peça) e `textures.ts` |
| `shared/`    | O que os mapas usam em comum (abaixo)                                                                                                            |

### `island/`

| Arquivo                                     | O que faz                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `terrain.ts`                                | A forma da ilha (`islandShape`), a altura e a cobertura do chão em cada ponto (`groundAt`: terra, grama, areia, rocha, neve…), o riacho e a distância até a trilha                                                                                                                                                                                               |
| `terrainNoise.ts`                           | O ruído suave (`noise`, `fbm`, `smoothstep`) que faz os morros e as bordas irregulares                                                                                                                                                                                                                                                                           |
| `ground.ts`                                 | `useIslandGround`: a malha low-poly do chão, uma cor por face                                                                                                                                                                                                                                                                                                    |
| `townPieces.ts`                             | O catálogo do KayKit (tamanho de cada casa, árvore, cerca…) e o que aparece em cada trecho da trilha (vila, floresta, castelo)                                                                                                                                                                                                                                   |
| `settlements.ts`                            | `planSettlements`: onde ficam o portão da vila, o castelo, o moinho d'água, as casas e as tralhas, e onde saem as chaminés                                                                                                                                                                                                                                       |
| `scatter.ts`                                | `scatterProps` (pinheiros, arbustos, pedras e tufos de grama), `lanternSpots` e `bridgeSpans` (onde a trilha cruza o riacho)                                                                                                                                                                                                                                     |
| `landmarks.ts`, `Landmarks.tsx`             | Um marco de cada personagem (prop do habitat dele: caldeirão, torii, coluna…). O lugar é planejado para o elenco inteiro, então cada personagem tem sempre o mesmo ponto: atrás da trilha, longe das casas, do riacho, das construções e dos outros marcos. Só aparecem os marcos de quem está na partida, e as árvores, pedras e arbustos abrem espaço em volta |
| `coast.ts`                                  | `planCoast`: pedras na beira d'água, o cais com o barco e as peças do kit Kenney no campo (arbustos, troncos, fogueiras, ponte)                                                                                                                                                                                                                                  |
| `dirtRoad.ts`                               | A textura da estrada de terra                                                                                                                                                                                                                                                                                                                                    |
| `Woods`, `Bridges`, `GrassTufts`, `Lantern` | Uma peça por arquivo                                                                                                                                                                                                                                                                                                                                             |

### `shared/`

| Arquivo                           | O que faz                                                                                                                                                                                                                                                        |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trailPlan.ts`                    | Contas de posicionamento usadas pelos três planos: `TRAIL_GROUND` (a altura do chão na trilha), `trailBounds`, `trailNearest`, `hidesTiles` (se algo alto esconde uma casa da câmera), `clearOfStart`, `isFree`, `footprint` e `pickWeighted` (sorteio com peso) |
| `kits.ts`                         | Os arquivos `.glb` dos kits gratuitos e o tipo `KitItem` (uma peça posta no mapa)                                                                                                                                                                                |
| `bakedPiece.ts`                   | Tira a malha de uma peça do `.glb`, já na posição, e tinge o material (`tinted`)                                                                                                                                                                                 |
| `KitPieces.tsx`                   | Desenha várias peças de um kit: um `InstancedMesh` por tipo de peça                                                                                                                                                                                              |
| `Instances.tsx`                   | O `InstancedMesh` genérico (tipo `Placed`), usado também pelos pinheiros, tufos e pontes                                                                                                                                                                         |
| `roadRibbon.ts` + `TrailRoad.tsx` | A estrada: a faixa ao longo de uma curva suave pela trilha (conta pura, com teste) e o componente que a pinta                                                                                                                                                    |
| `roadPaint.ts`                    | `fadeSides`: apaga as bordas da textura da estrada para ela sumir no chão                                                                                                                                                                                        |
| `Backdrop.tsx`                    | `Vault` (a cúpula escura em volta) e `TiledFloor` (o piso com a textura repetida) da masmorra e da terra devastada                                                                                                                                               |
| `Flames.tsx`, `ChimneySmoke.tsx`  | Chamas de tochas e fogueiras, fumaça de chaminés (sprites, sem luz)                                                                                                                                                                                              |

## Como funciona um mapa

1. O componente do mapa chama o seu **plano** (`planSettlements`, `planDungeon`, `planWasteland`…): uma função pura que recebe a trilha e devolve listas de peças (`KitItem`), chamas e chaminés.
2. O plano usa um `seededRandom` fixo, então o mapa sai **igual toda vez** para o mesmo tabuleiro.
3. Nada fica em cima da estrada, e nada alto fica na frente de uma casa vista da câmera (`hidesTiles`).
4. O componente entrega as listas ao `KitPieces`, que desenha tudo instanciado.

Os planos têm testes vitest ao lado (`*.test.ts`). Para mudar onde as coisas aparecem, mexa no plano e no teste.

## Cuidados

- **Sem luzes novas.** Lanternas, tochas e fogueiras brilham com material emissivo e bloom; uma luz a mais recompila todos os materiais.
- **Poças de luz dos postes** (`shared/lampGlow.ts`): os postes da ilha ficam na beira da estrada a cada 4 casas, do lado de trás em relação à câmera. A luz no chão é um mapa pintado uma vez (manchas alongadas ao longo da estrada, a mais clara vence onde se encontram) e somado no material do chão, da estrada e das lajes (`withLampGlow`), sem luz de verdade.
- **Praia e água:** a borda da ilha vira uma faixa de areia logo acima da água (`BEACH` em `terrain.ts`, nunca embaixo da trilha nem das montanhas); o oceano fica turquesa no raso e o riacho tem correnteza (`oceanShader.ts`).
- **Dragão do mar** (`SeaDragon.tsx`): modelo Meshy sem rig, animado em código: fica escondido e a cada 7–14 s salta no mar, na frente ou nos lados da ilha, num arco ao longo da praia, com anéis de respingo. No riacho não cabe: ele nunca fica a mais de ~2,5 da trilha.
- **Variedade na mata:** de cada 10 arbustos, 1 some e 4 viram flores sombrias, pedrinha ou pinheiro jovem (`BUSH_VARIETY` em `coast.ts`).
- A ordem das chamadas a `random()` num plano define o mapa inteiro: mudar a ordem muda onde tudo aparece.
