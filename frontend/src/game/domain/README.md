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
const { state: next, events } = applyCommand(state, { type: "rollDice", playerId: "p1" });
```

`applyCommand` é uma **função pura**: com o mesmo estado e o mesmo comando, o resultado é sempre igual (até o dado, que sai do próprio estado).
Ela não altera o estado antigo; devolve um novo. É isso que permite:

- testar tudo sem abrir o navegador (`*.test.ts` ao lado de cada arquivo);
- rodar exatamente o mesmo código no servidor do multiplayer.

## Como um comando é resolvido por dentro

Cada comando tem um **handler** (a função que o resolve) na pasta `handlers/`:

| Arquivo              | Comandos                                                                                               |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| `turnCommands.ts`    | `rollDice`, `forfeitTurn` (o tempo do turno acabou), `restart`                                         |
| `cardCommands.ts`    | `playCard`, `discardCard`, `fuseCards`                                                                 |
| `abilityCommands.ts` | `activateAbility`, `plunderCards`, `answerWard`, `chooseGrace`                                         |
| `shared.ts`          | `assertCanAct` (é a vez dele?), `settle` (fecha o rascunho: vitória, pausa ou fim de turno)            |
| `setup.ts`           | a partida do zero: distribui as cartas e esconde as armadilhas (usado por `createGame` e `restart`)    |
| `index.ts`           | `COMMAND_HANDLERS`, o mapa `comando → handler`                                                         |
| `resolve.ts`         | `resolveCommand`: monta o sorteio a partir de `state.rng`, chama o handler e guarda o sorteio avançado |

O tipo `CommandHandlers` exige um handler para cada `GameCommand`: comando novo sem handler não compila.

Dentro de um handler:

1. `startDraft(state)` (`core/draft.ts`) cria um **rascunho**: uma cópia de trabalho onde as regras vão anotando mudanças e eventos.
2. As regras mexem no rascunho em sequência: anda (`board/paths.ts`), para numa casa (`board/landing.ts`), dispara armadilha (`board/traps.ts`), compra carta (`cards/hand.ts`)…
3. `settle` fecha o rascunho num novo `GameState` imutável e devolve os eventos em ordem.

## Aleatoriedade

O sorteio mora **dentro do estado**: `state.rng = { seed, counter }` (`core/random.ts`, gerador mulberry32).
`seed` é a semente da partida e `counter` quantos números já saíram dela; `randomStream(rng)` retoma a sequência exatamente dali.

- `createGame(board, players, { seed })` exige a semente: quem hospeda a partida escolhe (hoje o navegador, em `features/match/model/createLocalMatch.ts`; depois, o servidor). O domínio nunca chama `Math.random()`.
- A cada comando, `resolveCommand` (`handlers/resolve.ts`) cria o gerador a partir de `state.rng`, entrega aos handlers o dado (`diceFrom`, em `core/dice.ts`) e o `random` dos embaralhamentos, e devolve o estado com o `counter` avançado.
- Por isso o engine não guarda nada entre um comando e outro: mesmo seed + mesmos comandos = mesmo estado (`core/replay.test.ts`). Um servidor pode refazer a partida só com o log de comandos.
- A lint proíbe em `game/` `Math.random`, `Date.now`, `new Date`, `performance.now`, `window` e `document`.

**Dado viciado nos testes:** só os helpers de `testing/` passam um dado fixo, chamando `resolveCommand(state, command, dados)` direto; a API pública (`applyCommand`) não tem esse parâmetro.
`send(state, comando, [3, 4])` rola 3 e depois 4; os embaralhamentos continuam saindo de `state.rng`, e o `seed` opcional do `send` reinicia esse sorteio para testar outros resultados.
Para um `LocalGameClient` em teste, `loadedDice([3, 4])` substitui o `applyCommand`.

**Modo teste da tela:** `createGame(..., { seed, chargedAbilities: true })` começa com todas as habilidades carregadas.

**Ids das cartas:** o `uid` de cada carta (`CardInstance.uid`) é sorteado de `state.rng` com `randomId` (`core/random.ts`): não diz de quem é a carta, em que ordem foi dada nem de onde veio. Continua determinístico (o replay passa).

## Visão por jogador (segredos)

O `GameState` tem tudo, inclusive o que nenhum jogador pode ver. No online, o servidor manda a cada um só a parte dele:

```ts
projectState(state, viewerId); // viewerId: o id do assento, ou null para espectador
projectEvents(events, viewerId);
```

Ficam em `core/projection.ts`. A forma continua a de `GameState`/`GameEvent`, para a tela rodar igual; o que é segredo vira `HIDDEN` (`core/hidden.ts`) ou carta virada (`hiddenCard`: `cardId` `"hidden"`, fora do `CARD_CATALOG`, só serve para contar). **As regras nunca rodam sobre um estado projetado**: o `applyCommand` usa sempre o estado completo (um selo `HIDDEN` que chegue nas regras dá erro).

| Campo                                 | Quem vê                                                                      | Os outros recebem                                |
| ------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------ |
| `player.hand`                         | o dono; o Guardião também vê a mão da vítima enquanto escolhe a Pilhagem     | cartas viradas, mesma quantidade                 |
| `player.deck`                         | ninguém (nem o dono sabe a ordem)                                            | cartas viradas, mesma quantidade                 |
| `player.discard`                      | todos (as cartas caem viradas para cima)                                     | —                                                |
| `decks` (lista do baralho de cada um) | o dono                                                                       | `[]`                                             |
| `hiddenTraps`                         | ninguém, menos as presas pela Chuva de Flechas (a regra diz que se revelam)  | só as presas                                     |
| `seals[].kind`                        | o Escriba dono do selo                                                       | `HIDDEN` (o lugar e o dono são públicos)         |
| `voidHold` com selo                   | o Zarek                                                                      | o selo vira `HIDDEN`; o resto do Vazio é público |
| `abilityCharge` da Têmis              | a Têmis (o Veredito arma em segredo)                                         | `0`                                              |
| `pendingDiscard.drawn` / `queued`     | quem comprou cada carta                                                      | carta virada                                     |
| `rng`                                 | ninguém (daria para prever dado, embaralhamento e para onde a escondida vai) | `{ seed: 0, counter: 0 }`                        |

| Evento                                                  | Os outros recebem                                               |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `cardDrawn`, `discardRequired`                          | carta virada                                                    |
| `cardDiscarded`                                         | a carta descartada aberta, a `hand` que sobrou virada           |
| `cardsStolen`                                           | aberto para quem roubou e quem foi roubado; virado para o resto |
| `abilityReady` da Têmis                                 | some                                                            |
| `voidSwallowed`, `voidCast`, `voidSeized`, `voidEchoed` | um selo no `item` vira `HIDDEN`                                 |

Públicos de propósito: `cardPlayed`, `cardsResurrected` (vêm do descarte), `cardsFused` e `cardTransmuted` (o log já anuncia a carta), `trapCursed` (a carta vai para o descarte), o resto do tabuleiro, as aparições e as marcas da Justiça.

**Para a tela:** as funções do domínio que a tela chama sobre o estado (`abilityBlocker`, `cardBlocker`, `seizableTiles`, `spellGround`, `harmGround`, `sealableTiles`, `hauntableTiles`…) só leem campos públicos ou o próprio jogador, e dão a mesma resposta no estado projetado (`projection.test.ts`). O `isHarmful` de `characters/fairy/bloom.ts` lê `hiddenTraps`, mas só roda dentro do `applyCommand`, nunca na tela.

**Teste:** `core/projection.test.ts` serializa o estado e os eventos projetados e procura os `uid`s e tipos secretos de cada campo, para cada assento e para o espectador, inclusive numa partida inteira jogada.

## Onde está cada coisa

| Pasta                | O que tem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core/`              | A base: `state.ts` (o `GameState` e o jogador), `commands.ts`, `events.ts`, `errors.ts`, `engine.ts`, `draft.ts` (o rascunho), `turn.ts` (fim de turno e rodadas), `dice.ts`, `energy.ts`, `random.ts`, `playerStatus.ts` (proteções e mira), `projection.ts` e `hidden.ts` (a visão de cada jogador).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `handlers/`          | Um handler por comando (tabela acima).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `board/`             | O tabuleiro: `board.ts`, `generator.ts`, `paths.ts` (andar e empurrar), `reach.ts` (quem está no alcance), `landing.ts` (parar numa casa), `traps.ts`, `hiddenTraps.ts`, `harm.ts`, `tileEffects.ts`, `realms.ts` (céu e inferno), `blessings.ts`, `presets.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `cards/`             | As cartas: `catalog.ts` (a lista), `play.ts` (jogar: paga, descarta, passa pelo Veredito e pelas proteções), `blocker.ts` (por que não dá para jogar agora, e o próximo portal), `choice.ts` (`CardChoice`, quem pode ser alvo, valor e sacrifícios válidos), `effects.ts` (o efeito de cada carta comum e seus números), `exclusive.ts` (as exclusivas de personagem), `hand.ts`, `decks.ts`, `fusion.ts`.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `abilities/`         | O que vale para toda habilidade: `ability.ts` (os ids), `blocker.ts` (por que não dá para usar agora), `charge.ts` (quantos turnos para carregar), `aim.ts` (quem pode ser alvo), `basic.ts` (as habilidades simples), `effects.ts` (`ABILITY_EFFECTS`: o que cada habilidade faz).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `characters/<nome>/` | A mecânica própria de cada personagem, com seus números de balanceamento no topo do arquivo e seus tipos em `types.ts`: `zarek/` (`void.ts` engole o perigo e guarda os números, `ground.ts` onde o Vazio pode soltar ou roubar, `place.ts` solta, `seize.ts` rouba feitiço, `rifts.ts` abre e fecha fendas, `feed.ts` carrega com armadilhas), `fairy/` (`bloom.ts` encanta o perigo à frente, `winter.ts` o Inverno Eterno e o gelo, `snow.ts` pisar na neve: carrega a fada, prende o rival e drena energia), `kage/flames.ts`, `seraphiel/seraph.ts`, `scribe/seals.ts`, `warden/specters.ts`, `themis/verdict.ts`, `archer/arrowRain.ts`, `jester/cardGamble.ts`, `bjorn/untamed.ts`, `alchemist/transmutation.ts`, `necromancer/resurrection.ts`, `auric/cleansingTide.ts`, `cronos/timeWarp.ts`, `alva/plasmaCannon.ts`. |
| `testing/`           | Helpers de teste (`newGame`, `withPlayer`, `send`, `roll`, `activate`, `play`, `loadedDice`) e tabuleiros prontos.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

`types.ts` na raiz é só a **vitrine para `features/`**: reexporta os tipos de cada pasta, para a tela importar tudo de `@/game/domain/types`. Dentro do domínio, cada arquivo importa o tipo direto de onde ele mora.

## Adicionando uma mecânica nova

1. Se o jogador precisa pedir algo novo, crie o comando em `core/commands.ts`.
2. Para cada coisa nova que acontece, crie o evento (em `core/events.ts` ou no `types.ts` do personagem). A tela anima a partir dele.
3. Escreva a regra num arquivo próprio (em `characters/<nome>/` se é de um personagem) e chame-a de um handler em `handlers/` ou do `board/landing.ts`. Habilidade nova ativada = uma linha em `ABILITY_EFFECTS`.
4. Escreva o teste junto (`minhaRegra.test.ts`). Monte a partida com os helpers de `testing/` (`newGame`, `withPlayer`, `roll`, `activate`, `play`, tabuleiros prontos em `boards.ts`) em vez de repetir a preparação.
5. Do lado da tela, adicione um handler em `features/match/model/playback/` para o evento novo. O TypeScript avisa se faltar.
