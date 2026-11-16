# match/model: o "cérebro" da tela da partida

Fica entre o jogo (`game/`) e o que aparece na tela (`scene/`, `ui/`). Não desenha nada e não tem React.

| Arquivo               | O que faz                                                                                                                                                                                                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `createLocalMatch.ts` | Monta uma partida offline: cria o jogo, o `LocalGameClient` e o store. No online, troca-se só o client aqui.                                                                                                                                                                   |
| `matchStore.ts`       | O **store**. Recebe os cliques (`rollDice`, `playCard`, `activateAbility`…), manda o comando ao `GameClient` e toca os passos da animação em fila.                                                                                                                             |
| `matchView/`          | A **`MatchView`**: o que a tela mostra _agora_ (posição de cada boneco, efeito tocando, banner). Também tem perguntas como `canRoll(view)` e `canPlayCard(view)`. Tipos em `view.ts`, `effect.ts` e `fx.ts`; funções em `create.ts`, `queries.ts`, `updates.ts` e `viewer.ts`. |
| `playback/`           | Transforma cada evento do jogo em passos de animação. Tem README próprio.                                                                                                                                                                                                      |

## O caminho de um clique

```
botão "Rolar" → store.rollDice() → GameClient.send(comando)
             → chegam { seq, estado, eventos } → playback: eventos viram passos
             → o store aplica um passo por vez na MatchView → a tela redesenha
```

## Conexão e identidade

- **`open()`** entra na partida pelo `GameClient.connect()`. Até o `Snapshot` chegar, `getSnapshot()` e `board` são `null` e a tela mostra a cortina de carregamento. **`close()`** sai e para a animação. O `useMatch` chama os dois no `useEffect`; se o `close` vier antes do `Snapshot` (o React faz isso no modo estrito), o `Snapshot` atrasado é ignorado.
- **`seq`**: o store guarda o último número que já tocou e ignora qualquer atualização com número igual ou menor (repetida ou já incluída no `Snapshot`). Se pular um número, toca mesmo assim: o último passo de cada jogada encaixa a tela no estado completo.
- **`localPlayerId`**: quem esta tela é. No jogo local segue o jogador da vez; no online fica preso ao assento que o servidor mandou. Todo comando sai pelo `dispatch`, o único lugar que confere isso: com assento preso, um comando em nome de outro jogador nem é enviado.
- **O que esta tela pode fazer**: `viewerControls(view, store.pinnedSeat)` (`matchView/viewer.ts`) responde num lugar só, e os componentes leem dele em vez de cada um conferir de novo: de quem é a mão mostrada (`viewerId`), se a vez é desta tela (`ownsTurn`: ampulheta e pausa), se pode rolar, jogar carta ou usar a habilidade, quais perguntas pendentes ela responde (`answers`) e por quem espera (`waitingFor`, que vira "Vez de <nome>…" no lugar do botão de rolar). No jogo local (`null`) é sempre o jogador da vez, igual às perguntas `canRoll`, `canPlayCard` e `canActivateAbility`.
- **Espectador** (a TV do modo festa): o snapshot também vem sem assento, então quem cria o store diz `new MatchStore(client, timings, { spectator: true })`. Aí `viewerControls(view, null, true)` não fala por ninguém (`viewerId` `null`, tudo `false`, `waitingFor` = quem a mesa espera) e o `dispatch` não envia nada. A tela é o mesmo `MatchTable` (`ui/MatchScreen.tsx`), que aceita `onRestart`, `className` e `children` para a TV.
- **Testar um assento preso**: em `npm run dev`, `/partida?jogadores=witch,zarek&assento=p2` prende a tela ao segundo jogador (o `createLocalMatch` passa o assento ao `LocalGameClient`, que também projeta o estado para ele). Em produção o parâmetro é ignorado. O outro assento não tem tela, então a partida para quando chega a vez dele: `assento=p1` joga a primeira vez e depois fica esperando; `assento=p2` já abre esperando, com a própria mão à mostra.
- **Ampulheta e reinício**: o relógio do turno fica na tela (`ui/hud/Hourglass.tsx`), porque só ela sabe quando há animação, pergunta ou pausa. Ao acabar, chama `store.forfeitTurn()`, que passa pelo `dispatch`: com assento preso, a ampulheta de uma tela nunca faz outro jogador perder a vez. `store.restart()` é só um pedido; quem decide é o `GameClient` (veja `game/application/README.md`).
- **Erros**: a recusa chega como `{ ok: false, code }` e vira texto pela tabela `ERROR_MESSAGES`. Falha de envio (queda) mostra "Falha ao enviar a jogada.".

## Por que a `MatchView` é separada do `GameState`

O `GameState` é **a verdade**: o jogador já está na casa 42.
A `MatchView` é **o que o público vê**: o boneco ainda está andando, na casa 39.
Sem essa separação, os bonecos se teletransportariam.

## A `MatchView` por dentro

Ela tem duas partes:

- **O topo**: o que é de todos e dura. Jogadores, vez, dado (`roll`, `lastRoll`), o banner (`effect`), as perguntas pendentes (`pendingWard`, `pendingDiscard`…) e o que está desenhado no tabuleiro (`seals`, `specters`, `blackFlames`, `winter`…). O `syncStep` encaixa tudo isso no estado real no fim de cada jogada.
- **`view.fx`**: as animações que estão tocando agora, uma de cada tipo (`MatchFx`): a carta jogada (`cast`), comprada (`drawing`), fundida, o raio do Monge (`dash`), as flechas (`volley`), a onda (`tide`), o atropelo do Bjorn (`trample`), a mão do inferno (`drag`) e a neve da fada (`frostStream`). Cada uma tem um `id` que muda a cada vez, para a cena e o som tocarem uma vez só. O `syncStep` não mexe nelas: elas existem só na tela, não no jogo.

Para escrever num passo de animação, use `withFx(view, { tide: ... })` e `nextFxId(view.fx.tide)`.
Animação nova de personagem = um tipo novo em `matchView/fx.ts` + um campo no `MatchFx` (e `null` no `NO_FX`).

O React lê o store pelo `useMatch` (em `hooks/`), que usa `useSyncExternalStore`: a tela redesenha sempre que a view muda.

## Bots, replay e estatísticas

- `bots.ts`: os jogadores do computador (marcados como **Bot** na tela Nova Partida, `?bots=2,3` na URL). Quando a tela está parada e é a vez de um deles (ou um aviso espera por ele), pede o lance a `game/domain/bots/simpleBot.ts` e manda direto ao cliente. A tela nunca joga por eles (`viewerControls` recebe `store.computerSeats`).
- `replay.ts`: assiste de novo a partida gravada pelo `LocalGameClient`, um comando por vez, esperando cada animação acabar (veja o README da application).
- As estatísticas (`game/domain/stats/matchStats.ts`) são somadas na `MatchView.stats` a cada atualização e aparecem na tela de fim de partida (`ui/hud/EndGamePanel.tsx`) com os prêmios.
