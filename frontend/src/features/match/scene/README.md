# scene: o mundo 3D da partida

Feito com **React Three Fiber**: Three.js escrito como componentes React (`<mesh>`, `<group>`…).
A cena só **lê** a `MatchView` (o que deve aparecer agora) e desenha. Ela nunca decide regra.

## Entrada

- `BoardScene.tsx`: o `<Canvas>`. Monta o ambiente, o tabuleiro, os bonecos e percorre o registro de efeitos.
- `CameraRig.tsx`: a câmera, com os três enquadramentos (perto, médio, tabuleiro) e o "olhar em volta".
- `PostEffects.tsx`: o pós-processamento (bloom, o brilho em volta das luzes).

## Pastas

| Pasta / arquivo | O que tem |
|---|---|
| `environment/` | O mundo em volta da trilha, por mapa (`maps.ts`), numa noite fechada e sombria: a ilha (`Island.tsx`), a masmorra (`Dungeon.tsx`, `dungeon.ts`) e a terra devastada (`Wasteland.tsx`, `wasteland.ts`), cada um com a sua estrada (`road.tsx`). A ilha onde a trilha serpenteia, com vila, acampamento na floresta, moinho d’água e castelo do kit KayKit (`settlements.ts`), costa com pedras e cais (`coast.ts`, kits em `kits.tsx`, escurecidos por `tint`), fumaça escura nas chaminés, estrada de terra com marcas de roda, relevo, riacho com pontes de madeira, pinheiros, pedras, tufos de grama e lanternas (`islandTerrain.ts` calcula o terreno), oceano, céu nublado (`SkyDome.tsx`) e pedras no mar. Sem figurantes andando |
| `realm/` | Os corredores do céu e do inferno: paredes, portais, partículas |
| `character/` | Tudo de personagem: modelo animado (`CharacterModel`), asas, cadeiras, e os efeitos de cada habilidade e intro |
| `vfx/` | Efeitos feitos com a biblioteca wawa-vfx (partículas de cura) |
| `effects/` | **O registro de efeitos**: quem monta cada efeito e quando (veja abaixo) |
| `PlayerToken.tsx` | Um jogador no tabuleiro: liga o movimento e a pose (`token/`) ao Three.js a cada quadro e monta os efeitos do registro em volta dele |
| `token/` | A lógica do boneco, sem React: `motion.ts` (o caminho casa a casa) e `pose.ts` (o clipe que toca e o corpo). Veja abaixo |
| `tokenSignals.ts` | Lê a `MatchView` e diz o que cada boneco está fazendo (correndo, sendo empurrado, usando a habilidade…) |
| `tokenPlacement.ts` | Onde cada boneco fica e para onde olha |
| `cameraFocus.ts` | O que a câmera acompanha e onde o dado cai |
| `TileMesh.tsx`, `tileTheme.ts`, `useTileFaceTexture.ts` | As casas: lajes da própria estrada (cortadas na curva por `layout.slab`), com uma runa acesa por tipo e o número na borda; o texto aparece numa etiqueta ao passar o mouse |
| `DiceThrow.tsx` | O dado 3D rolando |

## O boneco (`PlayerToken` + `token/`)

A cada quadro o `PlayerToken` faz três passos, nesta ordem:

1. **Movimento** (`token/motion.ts`). `followTarget` coloca o boneco no primeiro alvo e enfileira cada alvo novo como um *waypoint* (`travel`: `walk`, `teleport` ou `dash`). `advanceMotion` anda pelo *segmento* atual e pega o próximo waypoint quando ele acaba. O segmento é uma união discriminada por `motion`: `run` (com `arriving` na última casa da caminhada, que desacelera até parar), `leap` (o arco de um teleporte ou de um movimento longo demais para correr), `dash` (o raio do Sábio) e `slide` (sentado, só abre espaço na própria casa, sem levantar nem virar). O movimento também decide para onde o boneco olha (`heading`).
2. **Pose** (`token/pose.ts`). `stepPose` recebe os sinais do `tokenSignals`, o que o movimento fez neste quadro (`MotionFrame`), a duração dos clipes do modelo e o relógio, e devolve uma `Pose`: o clipe que toca, o `heading` corrigido (o Berserker de costas para o caminho ao empurrar, a Têmis olhando para quem ela julga), o que some (`hidden` dentro do raio, `gone` no Arrasto do Inferno), os deslocamentos do corpo (`spin`, `lunge`, `reel`, `sunk`) e os atos que começaram agora (`landingAt`, `shoveAt`, `hopBurst`). O estado de cada ato (quando começou, qual id já tocou) fica em `TokenActs`. A ordem dos atos dentro de `stepPose` importa: cada um lê o que os anteriores decidiram.
3. **Three.js** (`PlayerToken.tsx`). Aplica a pose: escreve o clipe na ref que o `CharacterModel` lê, atualiza as refs `live` dos efeitos, gira o boneco aos poucos até o `heading` e move o corpo.

Prioridade dos clipes, do mais forte ao mais fraco: `knocked` → `hop` → `shove` → `dash` → `land` → reação da Têmis (`guard` → `cast` → `scoff`) → `brake` → `run`/`float` → `sit` → `cast` → `rest`/`float`/`idle`.

O `CharacterModel` toca o clipe pedido. Como cada clipe toca (velocidade, se toca uma vez só) e quanto dura a transição entre dois clipes ficam em `character/clipPlayback.ts`, numa tabela com uma linha por clipe: um clipe novo em `CharacterClip` não compila até ganhar a sua linha.

`motion.ts`, `pose.ts` e `clipPlayback.ts` têm testes vitest ao lado (`*.test.ts`). Para mudar como um boneco se comporta, mexa neles e no teste, não no componente.

## Boas práticas que seguimos aqui

- **Sem luzes reais nos efeitos.** Brilho é feito com material emissivo e bloom, porque cada luz extra pesa em todas as superfícies.
- **Shaders (GLSL):** depois de mexer num shader, conferir o console do navegador para ver se compilou. Uma vez, uma palavra reservada (`half`) deixou o oceano preto.
- **Escala nunca zero:** um objeto com escala 0 gera NaN e o bloom espalha uma tela preta. Use no mínimo 0.005.

## O registro de efeitos (`effects/`)

Cada efeito visual é um componentezinho que decide **se** aparece e **com quais props**, e chama o componente de verdade (que mora em `character/`, por exemplo).
Eles ficam num arquivo por dono, com os mesmos nomes do domínio: `berserker.tsx`, `fairy.tsx`, `seraph.tsx`, `kunoichi.tsx`, `cards.tsx`, `tiles.tsx`…

O `effects/index.ts` junta tudo em listas, por lugar:

| Lista | Onde aparece | Recebe |
|---|---|---|
| `TOKEN_EFFECTS.aura` | em volta do boneco, na escala dele, subindo junto quando levita | `token` |
| `TOKEN_EFFECTS.ground` | nos pés do boneco | `token` |
| `TOKEN_EFFECTS.body` | no corpo, girando junto com ele | `token` |
| `TOKEN_EFFECTS.figure` | presos nos ossos do modelo (asas, varinha, frasco) | `token` e `figure` |
| `BOARD_EFFECTS` | no tabuleiro, antes dos bonecos | `fx` |
| `OVERLAY_EFFECTS` | no tabuleiro, depois dos bonecos | `fx` |

- `token` (`TokenFx`): o jogador, a ficha do personagem, a cor, os sinais do `tokenSignals` e as refs que o `PlayerToken` atualiza a cada quadro (`live.seated`, `live.wandOut`…).
- `fx` (`BoardFx`): a `MatchView`, o tabuleiro, o layout, quem está olhando e `shown(casa)` (se a trilha daquela casa está visível).
- **A ordem das listas é a ordem de montagem.** Ela foi copiada do JSX antigo, então mantenha-a ao mexer.

### Adicionando um efeito

1. Escreva o componente do efeito em `character/` (se for novo).
2. No arquivo do dono em `effects/`, exporte a regra: `export function MeuEfeito({ token }) { return token.x && <Efeito /> }`.
3. Adicione uma linha na lista certa do `effects/index.ts`.

O `PlayerToken` e a `BoardScene` não mudam.
