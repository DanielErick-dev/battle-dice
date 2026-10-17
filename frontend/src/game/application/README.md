# game/application: a porta entre a tela e o jogo

Um arquivo de contrato e uma implementação.

- `gameClient.ts` → a interface `GameClient`, que tem três métodos:
  - `getState()`: o estado atual;
  - `send(command)`: manda um comando;
  - `subscribe(listener)`: avisa a cada atualização (`{ state, events }`).
- `localGameClient.ts` → `LocalGameClient`: roda o `applyCommand` ali mesmo, no navegador.

## Por que existe

A tela **não sabe** quem resolve as jogadas. Ela só conhece o `GameClient`.

```
hoje:     tela → LocalGameClient ──→ applyCommand (no navegador)
online:   tela → WebSocketGameClient ──→ servidor FastAPI ──→ regras ──→ eventos para todos da sala
```

Para o multiplayer, basta escrever um `WebSocketGameClient` que implemente os mesmos três métodos:
- `send` vira uma mensagem JSON para o servidor;
- `subscribe` escuta as mensagens que voltam.

O resto do frontend não muda. Esse padrão se chama **porta e adaptador** (*ports and adapters*, ou arquitetura hexagonal).
