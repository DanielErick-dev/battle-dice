# Preparação do frontend para o backend

Pendências levantadas na inspeção de arquitetura de 07/11/2026, pensando na **opção B** do [backend-plano.md](backend-plano.md): o FastAPI cuida de contas, salas e WebSocket e, a cada jogada, repassa estado + comando para um serviço Node pequeno que só roda o `applyCommand` e não guarda nada.

**Legenda:** ⬜ a fazer · 🔄 em andamento · ✅ feito

## 1. Sorteio dentro do estado ✅

- `GameState.rng = { seed, counter }` (mulberry32 em `core/random.ts`); dado, embaralhamentos e sorteios saem dele. `createGame(board, players, { seed })` exige a semente; `applyCommand(state, command)` não recebe mais funções de fora.
- `handlers/resolve.ts` monta o sorteio a partir de `state.rng` a cada comando e grava o `counter` avançado.
- Dado viciado só nos testes: `send`/`roll` e `loadedDice` em `testing/`.
- `core/replay.test.ts`: mesmo seed + mesmo log de comandos (com `restart`) = mesmo estado.
- Lint em `src/game/**` proíbe `Math.random`, `Date.now`, `new Date`, `performance.now`, `window`, `document`.
- `chargedAbilities` virou opção do `createGame` (o `restart` volta ao normal, como antes).

## 2. Visão por jogador (segredos) ⬜

- Mão, deck, `hiddenTraps` e tipo dos selos vão no estado; `cardDrawn` leva a carta inteira; o `uid` (`p1:3`) entrega a carta.
- Fazer `projectState(state, viewerId)` e `projectEvents(events, viewerId)` no domínio, com testes de "nada secreto vaza".
- `uid` opaco gerado pelo sorteio do item 1.
- Funções que a tela usa sobre o estado (`ui/abilities/placements.ts`, `isHarmful` em `fairy/bloom.ts`) não podem depender de campos secretos.
- Depende do item 1.

## 3. `GameClient` pronto para cliente remoto ✅

- `connect(): Promise<Snapshot>` em vez de `getState()` síncrono.
- `GameUpdate { seq, state, events }` para ressincronizar depois de uma queda.
- Erro como `{ code }` (não `instanceof`, que não atravessa a rede).
- `localPlayerId` no `MatchStore` (hoje todo comando sai como o jogador da vez).
- `restart` e o tempo esgotado do turno decididos pelo servidor; a tela só mostra o relógio.
- ✅ Modo teste `chargedAbilities` vira opção do `createGame` (feito no item 1).
- **Feito em 11/11/2026**: `connect(): Promise<Snapshot { seq, state, localPlayerId }>`, `GameUpdate { seq, state, events }`, `send` devolve `{ ok: true } | { ok: false, code }` e só rejeita em falha de transporte. O `MatchStore` abre com `open()` (a tela mostra a cortina até o `Snapshot`), ignora `seq` repetido e guarda o `localPlayerId` (`null` = jogo local, segue o jogador da vez; assento preso só manda comando do próprio jogador). Detalhes em `game/application/README.md`.
- **Ficou de fora**: o relógio continua na tela (para nas animações e pausas, que só ela vê) e só manda o `forfeitTurn` do próprio assento; o prazo do servidor para quem cair nasce com o `WebSocketGameClient`.

## 4. Contrato TS ↔ Python ⬜

- Fonte única no TS: JSON Schema gerado dos `GameCommand` (e do `GameUpdate`).
- No Python, modelos Pydantic gerados do schema (`datamodel-code-generator`).
- O FastAPI trata `state` e `events` como JSON opaco; "quem pode agir" e a projeção ficam no Node.
- CI falha se o schema gerado mudar sem ser commitado.

## 5. `game/` como pacote ⬜

- npm workspaces: `packages/engine` (o atual `game/`) com tsconfig próprio sem DOM, `exports` públicos e vitest próprio.
- `features/` importa caminhos internos (`handlers/shared`); `seededRandom` do domínio é usado ~60 vezes pelo visual.
- Apagar o `node_modules/` vazio da raiz ou virar a raiz do workspace.
- Fazer por último: mexe em todos os imports.

## 6. Fronteira da lint ⬜

- Hoje a lint lista só o que é proibido em `game/`; trocar por "só imports relativos" (e `vitest` nos testes).
- Fica resolvido de vez com o item 5.

## 7. Organização 🟡

- ✅ `placements.test.ts` (12 testes). Os hooks de `match/hooks/` só ligam o React; a lógica já é testada em `connectMatchAudio` e no `MatchStore`.
- ✅ `frontend/.env.example` (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`), liberado nos `.gitignore`.
- ✅ `npm run format:check` no CI.
- ✅ Docs: `forfeitTurn` no README do domínio; contagem de linhas no `backend-plano.md`.
- Cena não revisada: `scene/environment` e `scene/realm` (os arquivos grandes de cena foram divididos em 07/11).
