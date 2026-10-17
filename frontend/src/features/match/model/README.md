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

O React lê o store pelo `useMatch` (em `hooks/`), que usa `useSyncExternalStore`: a tela redesenha sempre que a view muda.
