# characters: as fichas e os personagens em 3D

Tudo que desenha um personagem no tabuleiro (ou no menu): o modelo animado, os objetos que ele segura e os efeitos de cada habilidade.
Só visual: as regras ficam em `game/domain/`, e quem decide **quando** cada efeito aparece é `features/match/scene/effects/`.
Menu e partida usam esta pasta; ela não importa nenhum dos dois.

## As fichas

`sheets/<id>.ts` tem a ficha visual de um personagem (modelo, clipes, cores, efeitos, intro). `index.ts` monta o elenco (`CHARACTERS`, a ordem do seletor) e tem os ajudantes de jogador local; `types.ts` tem os tipos, incluindo `SceneryId`, a lista de palcos que `features/menu/stage/scenery` desenha.

Personagem novo = uma ficha em `sheets/` e uma linha em `CHARACTERS`.

## Pastas

| Pasta           | O que tem                                                                                                                                                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`         | O genérico, usado por todos: `CharacterModel` (carrega o `.glb` e toca os clipes), `clipPlayback` (velocidade e "toca uma vez" de cada clipe, testado), `bones` (achar um osso do rig Mixamo), `inHand` (prender um objeto na mão), `props` (registro dos objetos de cada personagem), `worldPlacement`, `figure`, `figureMaterials`. |
| `accessories/`  | Peças que vários personagens podem usar: asas (`Wings`), coroa (`HeadCrown`), cadeira de descanso (`RestChair`).                                                                                                                                                                                                                      |
| `shared/`       | Ferramentas de desenho sem personagem dono: texturas de canvas (`canvas`, `softDisc`, `parchment`, `runeCircle`, `ice`), números pseudoaleatórios estáveis (`hash`), `easing`, brilho aditivo (`additive`, `glowColor`), descarte de recursos (`disposal`), marcas no chão (`PickedTileMark`, `tileCover`), `NameTag`.                |
| `<personagem>/` | Uma pasta por personagem com tudo que só ele usa (ex.: `zarek/` com o Vazio, `scribe/` com a intro de sangue, `alchemist/` com o frasco).                                                                                                                                                                                             |

## Regras da pasta

- Arquivo de personagem pode importar de `core/`, `shared/` e `accessories/`; o contrário nunca.
- Se dois personagens precisam da mesma coisa, ela sobe para `shared/` (ou `accessories/`, se é uma peça visível).
- A conta (trajetórias, tempos, formas) vai para um `.ts` puro com teste ao lado (ex.: `bjorn/frostSlamLayout.ts`, `themis/verdictTimeline.ts`); o `.tsx` só monta a cena e anima.
- Nada de `<pointLight>` nos efeitos: adicionar luz recompila todos os materiais e trava o jogo. Use brilho aditivo.
- Meta: arquivos com até ~250 linhas. `ScribeIntro`, `SealScroll` e `TidalWave` ainda passam um pouco.
