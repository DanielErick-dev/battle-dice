# game/domain: as regras do jogo

Aqui mora **tudo o que o jogo decide**: quanto o dado anda, o que uma armadilha faz, quem uma habilidade alcança, quem venceu.
É TypeScript puro, sem React e sem Three.js. Não importa nada de `features/`.

## As 4 peças principais

| Peça        | Arquivo                                                                                                                   | O que é                                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Estado**  | `core/state.ts` → `GameState`                                                                                             | A fotografia completa da partida: tabuleiro, jogadores, cartas, efeitos no mapa.                         |
| **Comando** | `core/commands.ts` → `GameCommand`                                                                                        | O que um jogador _quer_ fazer: `rollDice`, `playCard`, `activateAbility`…                                |
| **Evento**  | `core/events.ts` → `GameEvent` (+ os eventos de cada tema: `board/events.ts`, `cards/events.ts`, `characters/*/types.ts`) | O que _aconteceu_ ao resolver o comando: `diceRolled`, `playerMoved`, `trapTriggered`…                   |
| **Engine**  | `core/engine.ts` → `applyCommand`                                                                                         | A porta de entrada: `(estado, comando) → (novo estado, eventos)`. Só repassa o comando ao handler certo. |

```ts
const { state: next, events } = applyCommand(state, { type: "rollDice", playerId: "p1" }, deps);
```

`applyCommand` é uma **função pura**: com o mesmo estado, o mesmo comando e os mesmos dados sorteados, o resultado é sempre igual.
Ela não altera o estado antigo; devolve um novo. É isso que permite:

- testar tudo sem abrir o navegador (`*.test.ts` ao lado de cada arquivo);
- rodar exatamente o mesmo código no servidor do multiplayer.

## Como um comando é resolvido por dentro

Cada comando tem um **handler** (a função que o resolve) na pasta `handlers/`:

| Arquivo              | Comandos                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------------------- |
| `turnCommands.ts`    | `rollDice`, `restart`                                                                                           |
| `cardCommands.ts`    | `playCard`, `discardCard`, `fuseCards`                                                                          |
| `abilityCommands.ts` | `activateAbility`, `plunderCards`, `answerWard`, `chooseGrace` (e `ABILITY_EFFECTS`: o que cada habilidade faz) |
| `shared.ts`          | `assertCanAct` (é a vez dele?), `settle` (fecha o rascunho: vitória, pausa ou fim de turno)                     |
| `setup.ts`           | a partida do zero: distribui as cartas e esconde as armadilhas (usado por `createGame` e `restart`)             |
| `index.ts`           | `COMMAND_HANDLERS`, o mapa `comando → handler`                                                                  |

O tipo `CommandHandlers` exige um handler para cada `GameCommand`: comando novo sem handler não compila.

Dentro de um handler:

1. `startDraft(state)` (`core/draft.ts`) cria um **rascunho**: uma cópia de trabalho onde as regras vão anotando mudanças e eventos.
2. As regras mexem no rascunho em sequência: anda (`board/paths.ts`), para numa casa (`board/landing.ts`), dispara armadilha (`board/traps.ts`), compra carta (`cards/hand.ts`)…
3. `settle` fecha o rascunho num novo `GameState` imutável e devolve os eventos em ordem.

## Aleatoriedade

Dado e embaralhamento chegam por `GameDependencies` (`deps.rollDice`, `deps.random`), em vez de chamar `Math.random()` direto.
Nos testes passamos um dado "viciado" e conferimos o resultado exato. No servidor, o dado vai ser sorteado lá, para ninguém trapacear.

## Onde está cada coisa

| Pasta                | O que tem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `core/`              | A base: `state.ts` (o `GameState` e o jogador), `commands.ts`, `events.ts`, `errors.ts`, `engine.ts`, `draft.ts` (o rascunho), `turn.ts` (fim de turno e rodadas), `moves.ts`, `dice.ts`, `energy.ts`, `random.ts`, `playerStatus.ts` (proteções e mira).                                                                                                                                                                                                                                        |
| `handlers/`          | Um handler por comando (tabela acima).                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `board/`             | O tabuleiro: `board.ts`, `generator.ts`, `paths.ts` (andar e empurrar), `reach.ts` (quem está no alcance), `landing.ts` (parar numa casa), `traps.ts`, `hiddenTraps.ts`, `harm.ts`, `tileEffects.ts`, `tilePicks.ts`, `realms.ts` (céu e inferno), `blessings.ts`, `presets.ts`.                                                                                                                                                                                                                 |
| `cards/`             | As cartas: `catalog.ts` (a lista), `play.ts` (o efeito de cada uma e seus números), `exclusive.ts` (as exclusivas de personagem), `hand.ts`, `decks.ts`, `fusion.ts`.                                                                                                                                                                                                                                                                                                                            |
| `abilities/`         | O que vale para toda habilidade: `ability.ts` (os ids), `charge.ts` (quantos turnos para carregar), `aim.ts` (quem pode ser alvo), `basic.ts` (as habilidades simples), `effects.ts`.                                                                                                                                                                                                                                                                                                            |
| `characters/<nome>/` | A mecânica própria de cada personagem, com seus números de balanceamento no topo do arquivo e seus tipos em `types.ts`: `zarek/void.ts` (o Vazio e as fendas), `fairy/winter.ts`, `kage/flames.ts`, `seraphiel/seraph.ts`, `scribe/seals.ts`, `warden/specters.ts`, `themis/verdict.ts`, `archer/arrowRain.ts`, `jester/cardGamble.ts`, `bjorn/untamed.ts`, `alchemist/transmutation.ts`, `necromancer/resurrection.ts`, `auric/cleansingTide.ts`, `cronos/timeWarp.ts`, `alva/plasmaCannon.ts`. |
| `testing/`           | Helpers de teste (`newGame`, `withPlayer`, `roll`, `activate`, `play`) e tabuleiros prontos.                                                                                                                                                                                                                                                                                                                                                                                                     |

`types.ts` na raiz é só a **vitrine para `features/`**: reexporta os tipos de cada pasta, para a tela importar tudo de `@/game/domain/types`. Dentro do domínio, cada arquivo importa o tipo direto de onde ele mora.

## Adicionando uma mecânica nova

1. Se o jogador precisa pedir algo novo, crie o comando em `core/commands.ts`.
2. Para cada coisa nova que acontece, crie o evento (em `core/events.ts` ou no `types.ts` do personagem). A tela anima a partir dele.
3. Escreva a regra num arquivo próprio (em `characters/<nome>/` se é de um personagem) e chame-a de um handler em `handlers/` ou do `board/landing.ts`. Habilidade nova ativada = uma linha em `ABILITY_EFFECTS`.
4. Escreva o teste junto (`minhaRegra.test.ts`). Monte a partida com os helpers de `testing/` (`newGame`, `withPlayer`, `roll`, `activate`, `play`, tabuleiros prontos em `boards.ts`) em vez de repetir a preparação.
5. Do lado da tela, adicione um handler em `features/match/model/playback/` para o evento novo. O TypeScript avisa se faltar.
