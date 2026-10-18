# match/model: o "cérebro" da tela da partida

Fica entre o jogo (`game/`) e o que aparece na tela (`scene/`, `ui/`). Não desenha nada e não tem React.

| Arquivo | O que faz |
|---|---|
| `createLocalMatch.ts` | Monta uma partida offline: cria o jogo, o `LocalGameClient` e o store. No online, troca-se só o client aqui. |
| `matchStore.ts` | O **store**. Recebe os cliques (`rollDice`, `playCard`, `activateAbility`…), manda o comando ao `GameClient` e toca os passos da animação em fila. |
| `matchView.ts` | A **`MatchView`**: o que a tela mostra *agora* (posição de cada boneco, efeito tocando, banner). Também tem perguntas como `canRoll(view)` e `canPlayCard(view)`. |
| `playback/` | Transforma cada evento do jogo em passos de animação. Tem README próprio. |

## O caminho de um clique

```
botão "Rolar" → store.rollDice() → GameClient.send(comando)
             → chegam { estado, eventos } → playback: eventos viram passos
             → o store aplica um passo por vez na MatchView → a tela redesenha
```

## Por que a `MatchView` é separada do `GameState`

O `GameState` é **a verdade**: o jogador já está na casa 42.
A `MatchView` é **o que o público vê**: o boneco ainda está andando, na casa 39.
Sem essa separação, os bonecos se teletransportariam.

## A `MatchView` por dentro

Ela tem duas partes:

- **O topo**: o que é de todos e dura. Jogadores, vez, dado (`roll`, `lastRoll`), o banner (`effect`), as perguntas pendentes (`pendingWard`, `pendingDiscard`…) e o que está desenhado no tabuleiro (`seals`, `specters`, `blackFlames`, `winter`…). O `syncStep` encaixa tudo isso no estado real no fim de cada jogada.
- **`view.fx`**: as animações que estão tocando agora, uma de cada tipo (`MatchFx`): a carta jogada (`cast`), comprada (`drawing`), fundida, transmutada, o raio do Monge (`dash`), as flechas (`volley`), a onda (`tide`), o atropelo do Bjorn (`trample`), a mão do inferno (`drag`) e a neve da fada (`frostStream`). Cada uma tem um `id` que muda a cada vez, para a cena e o som tocarem uma vez só. O `syncStep` não mexe nelas: elas existem só na tela, não no jogo.

Para escrever num passo de animação, use `withFx(view, { tide: ... })` e `nextFxId(view.fx.tide)`.
Animação nova de personagem = um tipo novo em `matchView.ts` + um campo no `MatchFx` (e `null` no `NO_FX`).

O React lê o store pelo `useMatch` (em `hooks/`), que usa `useSyncExternalStore`: a tela redesenha sempre que a view muda.
