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
| `PlayerToken.tsx` | Um jogador no tabuleiro: o movimento, o clipe que toca e os efeitos do registro em volta dele |
| `tokenSignals.ts` | Lê a `MatchView` e diz o que cada boneco está fazendo (correndo, sendo empurrado, usando a habilidade…) |
| `tokenPlacement.ts` | Onde cada boneco fica e para onde olha |
| `cameraFocus.ts` | O que a câmera acompanha e onde o dado cai |
| `TileMesh.tsx`, `tileTheme.ts`, `useTileFaceTexture.ts` | As casas: lajes da própria estrada (cortadas na curva por `layout.slab`), com uma runa acesa por tipo e o número na borda; o texto aparece numa etiqueta ao passar o mouse |
| `DiceThrow.tsx` | O dado 3D rolando |

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
