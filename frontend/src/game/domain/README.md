# game/domain: as regras do jogo

Aqui mora **tudo o que o jogo decide**: quanto o dado anda, o que uma armadilha faz, quem uma habilidade alcança, quem venceu.
É TypeScript puro, sem React e sem Three.js. Não importa nada de `features/`.

## As 4 peças principais

| Peça | Arquivo | O que é |
|---|---|---|
| **Estado** | `types.ts` → `GameState` | A fotografia completa da partida: tabuleiro, jogadores, cartas, efeitos no mapa. |
| **Comando** | `commands.ts` → `GameCommand` | O que um jogador *quer* fazer: `rollDice`, `playCard`, `activateAbility`… |
| **Evento** | `events.ts` → `GameEvent` | O que *aconteceu* ao resolver o comando: `diceRolled`, `playerMoved`, `trapTriggered`… |
| **Engine** | `engine.ts` → `applyCommand` | A porta de entrada: `(estado, comando) → (novo estado, eventos)`. Só repassa o comando ao handler certo. |

```ts
const { state: next, events } = applyCommand(state, { type: "rollDice", playerId: "p1" }, deps);
```

`applyCommand` é uma **função pura**: com o mesmo estado, o mesmo comando e os mesmos dados sorteados, o resultado é sempre igual.
Ela não altera o estado antigo; devolve um novo. É isso que permite:
- testar tudo sem abrir o navegador (`*.test.ts` ao lado de cada arquivo);
- rodar exatamente o mesmo código no servidor do multiplayer.

## Como um comando é resolvido por dentro

Cada comando tem um **handler** (a função que o resolve) na pasta `handlers/`:

| Arquivo | Comandos |
|---|---|
| `turnCommands.ts` | `rollDice`, `restart` |
| `cardCommands.ts` | `playCard`, `discardCard`, `fuseCards` |
| `abilityCommands.ts` | `activateAbility`, `plunderCards`, `answerWard`, `chooseGrace` (e `ABILITY_EFFECTS`: o que cada habilidade faz) |
| `shared.ts` | `assertCanAct` (é a vez dele?), `settle` (fecha o rascunho: vitória, pausa ou fim de turno) |
| `setup.ts` | a partida do zero: distribui as cartas e esconde as armadilhas (usado por `createGame` e `restart`) |
| `index.ts` | `COMMAND_HANDLERS`, o mapa `comando → handler` |

O tipo `CommandHandlers` exige um handler para cada `GameCommand`: comando novo sem handler não compila.

Dentro de um handler:
1. `startDraft(state)` (`draft.ts`) cria um **rascunho**: uma cópia de trabalho onde as regras vão anotando mudanças e eventos.
2. As regras mexem no rascunho em sequência: anda (`board.ts`), para numa casa (`landing.ts`), dispara armadilha, compra carta (`deck.ts`)…
3. `settle` fecha o rascunho num novo `GameState` imutável e devolve os eventos em ordem.

## Aleatoriedade

Dado e embaralhamento chegam por `GameDependencies` (`deps.rollDice`, `deps.random`), em vez de chamar `Math.random()` direto.
Nos testes passamos um dado "viciado" e conferimos o resultado exato. No servidor, o dado vai ser sorteado lá, para ninguém trapacear.

## Onde está cada coisa

- **Base:** `types.ts`, `engine.ts`, `handlers/`, `turn.ts` (fim de turno e rodadas), `landing.ts` (parar numa casa), `players.ts` (proteções e alcance).
- **Tabuleiro:** `board.ts`, `boardGenerator.ts`, `realms.ts` (céu e inferno), `blessings.ts`, `hiddenTraps.ts`.
- **Cartas:** `cards.ts` (catálogo), `cardPlay.ts` (efeitos), `deck.ts`, `fusion.ts`.
- **Habilidades:** `abilities.ts` (carga e lista), mais um arquivo por personagem com mecânica própria: `void.ts` (o Vazio do Zarek e as fendas, casas novas no tabuleiro), `fairy.ts`, `kunoichi.ts`, `berserker.ts`, `seraph.ts`, `seals.ts`, `specters.ts`, `arrowRain.ts`, `cardGamble.ts`, `transmutation.ts`, `resurrection.ts`, `newcomerAbilities.ts`.

## Adicionando uma mecânica nova

1. Se o jogador precisa pedir algo novo, crie o comando em `commands.ts`.
2. Para cada coisa nova que acontece, crie o evento em `events.ts`. A tela anima a partir dele.
3. Escreva a regra num arquivo próprio e chame-a de um handler em `handlers/` ou do `landing.ts`. Habilidade nova ativada = uma linha em `ABILITY_EFFECTS`.
4. Escreva o teste junto (`minhaRegra.test.ts`). Monte a partida com os helpers de `testing/` (`newGame`, `withPlayer`, `roll`, `activate`, `play`, tabuleiros prontos em `boards.ts`) em vez de repetir a preparação.
5. Do lado da tela, adicione um handler em `features/match/model/playback/` para o evento novo. O TypeScript avisa se faltar.
