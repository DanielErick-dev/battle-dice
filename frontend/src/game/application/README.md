# game/application: a porta entre a tela e o jogo

Um arquivo de contrato e uma implementação, mais a entrada do schema para o backend.

- `gameClient.ts` → a interface `GameClient`, que tem quatro métodos:
  - `connect()`: entra na partida e devolve, de forma **assíncrona**, um `Snapshot { seq, state, localPlayerId }`;
  - `send(command)`: manda um comando e devolve `{ ok: true }` ou `{ ok: false, code }`;
  - `subscribe(listener)`: avisa a cada jogada aceita com um `GameUpdate { seq, state, events }`;
  - `close()`: sai da partida (no online, fecha o WebSocket).
- `localGameClient.ts` → `LocalGameClient`: roda o `applyCommand` ali mesmo, no navegador. O `connect` responde na hora. Com um `localPlayerId` (terceiro parâmetro), manda só o que esse assento pode ver (`projectState`/`projectEvents`, ver o README do domínio), como o servidor fará; sem ele (`null`, o jogo local de hoje) manda o estado completo.
- `contract.ts` → só tipos: o que vira o JSON Schema em `contracts/game.schema.json` (`npm run schema`), com `state` e `events` opacos. Fluxo e modelos Pydantic em [contracts/README.md](../../../../contracts/README.md).

## Por que existe

A tela **não sabe** quem resolve as jogadas. Ela só conhece o `GameClient`.

```
hoje:     tela → LocalGameClient ──→ applyCommand (no navegador)
online:   tela → WebSocketGameClient ──→ servidor FastAPI ──→ regras ──→ eventos para todos da sala
```

Para o multiplayer, basta escrever um `WebSocketGameClient` que implemente os mesmos métodos:

- `connect` abre o WebSocket e espera o primeiro estado da sala;
- `send` vira uma mensagem JSON para o servidor;
- `subscribe` escuta as mensagens que voltam.

O resto do frontend não muda. Esse padrão se chama **porta e adaptador** (_ports and adapters_, ou arquitetura hexagonal).

## Pensado para a rede

- **`connect` é assíncrono**: pela rede o estado demora a chegar. A tela mostra o carregamento até o `Snapshot` chegar.
- **`seq`**: cada jogada aceita ganha um número, um a mais que a anterior. O `Snapshot` diz até qual número ele já inclui. Assim quem recebe sabe descartar uma atualização repetida ou atrasada, e depois de uma queda dá para pedir um `Snapshot` novo e continuar dali.
- **Erro como dado**: uma jogada recusada pelas regras volta como `{ ok: false, code: "NOT_YOUR_TURN" }`, não como exceção. Um `instanceof GameRuleError` não atravessa a rede; um `code` em JSON atravessa. O `send` só falha (rejeita) quando a jogada nem chegou, como numa queda de conexão.
- **`localPlayerId`**: quem esta tela é. `null` no jogo local (todos jogam na mesma tela, um de cada vez); no online, o servidor diz qual assento é seu.

## Quem decide o reinício e o tempo esgotado

- **`restart`** é só um pedido (`{ type: "restart" }`, sem `playerId`). Quem decide é quem tem a autoridade: o `LocalGameClient` sempre aceita; no online, o servidor escolhe a regra (só o dono da sala, todos concordam…).
- **Tempo esgotado**: o relógio continua na tela (`useHourglass`), porque ele para durante as animações, as perguntas, a cortina de carregamento e as pausas, e só a tela sabe disso. Quando acaba, a tela manda `forfeitTurn` em nome do jogador da vez. No online isso é seguro: o `MatchStore` com assento preso só manda o `forfeitTurn` do próprio assento (ninguém faz o outro perder a vez), e o domínio recusa se não for a vez dele.
- **O que falta para o online**: o servidor precisa do próprio prazo, mais folgado (`TURN_SECONDS` + uma margem para as animações), para o jogador que caiu ou largou a tela e nunca vai mandar o `forfeitTurn`. As pausas também viram pedido ao servidor. Isso nasce com o `WebSocketGameClient` e não muda este contrato.
