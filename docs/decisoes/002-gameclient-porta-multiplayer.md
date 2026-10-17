# 002: `GameClient` como porta para o multiplayer

**Status:** Aceita · **Data:** set/2026 (registrada em 17/10/2026)

## Contexto
Hoje todos jogam na mesma tela. O plano é jogar online, com um backend em FastAPI e WebSocket na AWS.
Se a tela chamasse o engine diretamente, o multiplayer obrigaria a reescrever a tela.

## Decisão
A tela só fala com a interface `GameClient` (`game/application/gameClient.ts`), que tem três métodos:
- `getState()`;
- `send(command)`;
- `subscribe(listener)`.

Hoje a implementação é o `LocalGameClient`, que roda o engine no navegador. No online será um `WebSocketGameClient`.

O **protocolo** com o servidor são os próprios tipos do domínio:
- o cliente envia um `GameCommand` (JSON);
- o servidor responde com a lista de `GameEvent` e o estado novo.

## Consequências
- ✅ O multiplayer não muda a tela: só troca o adaptador.
- ✅ O contrato já está tipado e testado antes de existir o servidor.
- ⚠️ O servidor Python precisa espelhar os tipos de `commands.ts` e `events.ts`. Para isso, vale gerar um schema compartilhado (JSON Schema ou Pydantic) quando o backend começar.
- ⚠️ Segredos (as cartas dos outros, as armadilhas escondidas) não podem ir para todos no estado. O servidor vai precisar de uma "visão por jogador".
