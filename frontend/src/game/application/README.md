# game/application: a porta entre a tela e o jogo

Um arquivo de contrato e uma implementação, mais a entrada do schema para o backend. O modo festa (TV + celulares) fica em `party/`, no fim deste README.

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

## Modo festa: TV + celulares (`party/`)

A TV mostra o tabuleiro (espectadora, sem segredo nenhum) e cada jogador usa o **celular como controle** (mão, dado, habilidade, perguntas). O jogo local na mesma tela (hot-seat) continua igual: nada aqui mexe no `LocalGameClient` nem no `MatchStore`.

```
celular A ─ RemoteGameClient ─┐                     ┌─ LocalGameClient → applyCommand
celular B ─ RemoteGameClient ─┼─ Transport ─ MatchHost ┤
TV        ─ RemoteGameClient ─┘  (canal)            └─ projectState/projectEvents por assento
```

| Arquivo               | O que faz                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `protocol.ts`         | Só tipos: as mensagens JSON entre o anfitrião e cada controle (lista abaixo). Também viram schema em `contracts/`.                             |
| `transport.ts`        | A interface `Transport` (`send`, `onMessage`, `close`) e o `BroadcastChannelTransport`: abas do mesmo navegador conversam pelo código da sala. |
| `matchHost.ts`        | `MatchHost`: a autoridade. Guarda o estado completo, distribui os assentos e manda para cada um só o que ele pode ver.                         |
| `remoteGameClient.ts` | `RemoteGameClient`: um `GameClient` que fala com o anfitrião pelo `Transport`. O `MatchStore` roda em cima dele sem mudar nada.                |
| `memoryTransport.ts`  | `MemoryRoom`: sala na memória, entrega na hora e passa tudo por `JSON` (testes; serve também para anfitrião e TV na mesma aba).                |
| `index.ts`            | Exporta tudo e os atalhos `hostPartyOnChannel(sala, estado)` e `joinPartyOnChannel(sala, pedido)`.                                             |

### As mensagens

Toda mensagem do controle leva o `clientId` (fixo por tela, guardado no `sessionStorage` para recuperar o assento depois de recarregar); toda mensagem do anfitrião leva o `to` (para quem é: num canal compartilhado todo mundo ouve tudo).

- Controle → anfitrião (`ControllerMessage`):
  - `join { role: "player" | "spectator", seat?, name?, character? }`: pede um assento (um específico, o que já era seu ou o primeiro livre) ou entra como espectador;
  - `command { requestId, command }`: um `GameCommand`;
  - `resync { sinceSeq }`: "a última jogada que eu tenho é esta";
  - `leave`: saiu.
- Anfitrião → controle (`HostMessage`):
  - `snapshot { seq, state, localPlayerId }`: ao entrar e quando o resync não dá para repetir (`localPlayerId` `null` = espectador);
  - `joinRefused { reason }`: `ROOM_FULL`, `SEAT_TAKEN` ou `UNKNOWN_SEAT`;
  - `update { seq, state, events }`: cada jogada aceita, já projetada para o assento;
  - `commandResult { requestId, result }`: `{ ok: true }` ou `{ ok: false, code }`. O `code` é uma regra do jogo (`NOT_YOUR_TURN`…) ou do anfitrião (`NOT_SEATED`, `NOT_YOUR_SEAT`, `RESTART_NOT_ALLOWED`);
  - `presence { seats, spectators }`: quem está em cada assento, a cada entrada e saída;
  - `closed { reason }`: `HOST_CLOSED` (a partida acabou) ou `SEAT_RELEASED` (o anfitrião liberou o seu assento).

### O que o `MatchHost` garante

- **Segredo**: cada controle recebe `projectState`/`projectEvents` do próprio assento; a TV recebe com `null`. O estado completo nunca sai do anfitrião.
- **Assento**: um comando só passa se o `playerId` for o assento de quem mandou (`NOT_YOUR_SEAT`); espectador não manda comando (`NOT_SEATED`). O resto (vez, energia…) quem recusa são as regras, com o código de sempre.
- **Reinício**: por padrão só a tela anfitriã reinicia (`host.restart()`); com `{ restart: "anyone" }` qualquer assento pode.
- **Queda**: guarda as últimas 64 jogadas (`historySize`). No `resync`, repete as que faltaram (as animações tocam); se for coisa demais, manda um `snapshot` novo.
- **Reconexão**: o mesmo `clientId` volta para o mesmo assento. Um celular que sumiu sem `leave` segura o assento até o anfitrião chamar `releaseSeat(playerId)`.

### O que o `RemoteGameClient` faz

- `connect()` abre um transporte novo (o `MatchStore` fecha e reabre o mesmo client no modo estrito do React), manda o `join` e espera o `snapshot`. Recusa vira `JoinRefusedError`; sem resposta em 8 s, rejeita.
- Ignora `update` repetido; se pular um `seq`, descarta e pede `resync`. Um `snapshot` depois de conectado vira um `GameUpdate` sem eventos (o `syncStep` encaixa a tela).
- `send` devolve o `CommandResult` das regras; recusa do anfitrião vira `HostRefusedError` (é bug de tela, não regra), e o `MatchStore` mostra "Falha ao enviar a jogada.".
- Extras para as telas: `localPlayerId`, `presence`/`subscribePresence` (lista de assentos para o lobby e para o celular escolher) e `onClosed`.

### Como as telas usam

```ts
// TV (anfitriã): cria o jogo, abre a sala e assiste como espectadora.
const host = hostPartyOnChannel("ABCD", createGame(board, roster, { seed }));
const tv = new MatchStore(joinPartyOnChannel("ABCD", { clientId: "tv", role: "spectator" }));

// Celular: entra num assento (ou primeiro como espectador, para escolher pelo `presence`).
const phone = new MatchStore(joinPartyOnChannel("ABCD", { clientId, role: "player", name: "Ana" }));
```

- A TV espectadora tem `localPlayerId` `null`, igual ao hot-seat; por isso a TV cria o store com `new MatchStore(client, undefined, { spectator: true })`, que esconde todos os controles e não envia comando (veja `features/party/tv/README.md`).
- O celular (`/controle`) cria o store com o assento escolhido e cuida da queda pela `ControllerConnection` (veja `features/party/controller/README.md`).
- O `clientId` vem de fora (ex.: `crypto.randomUUID()` guardado no `sessionStorage`), porque `game/` não sorteia nada fora do `state.rng`.

### Trocar pelo servidor de verdade (`WebSocketTransport`)

O FastAPI faz o papel do `MatchHost`; a TV vira só mais uma espectadora. Um `WebSocketTransport` só precisa implementar `ControllerTransport`:

- no construtor, abrir um `WebSocket` em `NEXT_PUBLIC_WS_URL` + `/salas/<código>`;
- `send(mensagem)`: `socket.send(JSON.stringify(mensagem))` (guardar numa fila até o `open`);
- `onMessage(fn)`: no `message`, `fn(JSON.parse(evento.data))`;
- `close()`: `socket.close()`;
- se o socket cair, o `RemoteGameClient` rejeita os envios pendentes por tempo esgotado; o próximo `connect()` reabre e o `join` com o mesmo `clientId` recupera o assento.

Nada mais muda: `new RemoteGameClient(() => new WebSocketTransport(sala), pedido)`.
