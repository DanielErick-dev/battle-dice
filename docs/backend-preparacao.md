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

## 2. Visão por jogador (segredos) ✅

- Mão, deck, `hiddenTraps` e tipo dos selos vão no estado; `cardDrawn` leva a carta inteira; o `uid` (`p1:3`) entrega a carta.
- Fazer `projectState(state, viewerId)` e `projectEvents(events, viewerId)` no domínio, com testes de "nada secreto vaza".
- `uid` opaco gerado pelo sorteio do item 1.
- Funções que a tela usa sobre o estado (`ui/abilities/placements.ts`, `isHarmful` em `fairy/bloom.ts`) não podem depender de campos secretos.
- Depende do item 1.
- **Feito em 11/11/2026**: `projectState(state, viewerId)` e `projectEvents(events, viewerId)` em `game/domain/core/projection.ts` (`viewerId` `null` = espectador, não vê segredo nenhum). Mesma forma de `GameState`/`GameEvent`: segredo vira `HIDDEN` ou carta virada (`core/hidden.ts`, `isHiddenCard`). O `uid` de toda carta agora é sorteado de `state.rng` (`randomId`). O `LocalGameClient` ganhou um terceiro parâmetro `localPlayerId`: com ele manda o estado e os eventos projetados; `null` (o jogo local de hoje) segue com o estado completo, sem mudar nada na tela. Tabela completa no [README do domínio](../frontend/src/game/domain/README.md#visão-por-jogador-segredos). Testes em `core/projection.test.ts` (18) e `localGameClient.test.ts`.
- **Decisões por campo** (⚠ = confirmar com você):
  - Mão: só o dono. Os outros recebem cartas viradas na mesma quantidade.
  - Deck: virado para todos, até para o dono (ninguém sabe a ordem). A lista `decks` só para o dono.
  - ⚠ Descarte: aberto para todos (as cartas jogadas e descartadas caem viradas para cima). A Ressurreição pega dele, então as cartas ressuscitadas também são públicas.
  - Armadilhas escondidas: ninguém vê. Elas não têm dono, então nem o espectador vê. Só as presas pela Chuva de Flechas aparecem, porque a regra diz que se revelam.
  - Selos: o lugar e o dono são públicos; o tipo, só o Escriba (regra: "só você sabe qual é qual"). O `sealBroken` revela o tipo para todos, porque o efeito aparece.
  - ⚠ Selo dentro do Vazio do Zarek: o tipo é só dele (também quando ele o solta ou ecoa). O resto do Vazio (armadilha, fogo, neve, aparição) é público, porque a regra não fala em segredo.
  - Carga da Têmis: só ela vê (regra: "carga secreta"). Os outros recebem `0` e não recebem o `abilityReady` dela.
  - ⚠ Pilhagem: enquanto a Pilhagem espera, o Guardião vê a mão da vítima (a tela de hoje mostra as cartas abertas para ele escolher). Se a ideia for escolher às cegas, basta mandar a mão virada e escolher por posição.
  - ⚠ Cartas roubadas (`cardsStolen`: Aposta do Coringa, Pilhagem, Dízimo): abertas para quem roubou e quem foi roubado; viradas para o resto da mesa.
  - ⚠ Fusão e Transmutação: públicas (o log de hoje já diz "fundiu cartas em X" e "transmutou A em B"). Isso revela uma carta que fica na mão.
  - Carta comprada (`cardDrawn`, `discardRequired`, `pendingDiscard`): só quem comprou, mesmo uma relíquia do céu (que estava à vista na casa).
  - `rng`: ninguém. Com a semente dá para prever o dado, a ordem dos baralhos e para onde a armadilha escondida vai.
- **Para a tela online** (nada disso muda o jogo local):
  - ✅ `DiscardPicker` e escolha da Pilhagem só para o assento que decide (feito com o item 3, `viewerControls`).
  - ✅ `CardHand` mostra a mão do assento local.
  - ✅ `?` na carga da Têmis para quem não é ela, também na vez dela (no jogo local continua: só na vez dela aparece).
  - Durante a animação, a contagem do deck de um rival pode ficar uma carta atrasada (o `cardDrawn` virado não acha o `uid` no deck virado). O `syncStep` do fim da jogada acerta.
  - O `DrawOverlay` já mostra o verso (`CardBack`) quando a carta chega virada.

## 3. `GameClient` pronto para cliente remoto ✅

- `connect(): Promise<Snapshot>` em vez de `getState()` síncrono.
- `GameUpdate { seq, state, events }` para ressincronizar depois de uma queda.
- Erro como `{ code }` (não `instanceof`, que não atravessa a rede).
- `localPlayerId` no `MatchStore` (hoje todo comando sai como o jogador da vez).
- `restart` e o tempo esgotado do turno decididos pelo servidor; a tela só mostra o relógio.
- ✅ Modo teste `chargedAbilities` vira opção do `createGame` (feito no item 1).
- **Feito em 11/11/2026**: `connect(): Promise<Snapshot { seq, state, localPlayerId }>`, `GameUpdate { seq, state, events }`, `send` devolve `{ ok: true } | { ok: false, code }` e só rejeita em falha de transporte. O `MatchStore` abre com `open()` (a tela mostra a cortina até o `Snapshot`), ignora `seq` repetido e guarda o `localPlayerId` (`null` = jogo local, segue o jogador da vez; assento preso só manda comando do próprio jogador). Detalhes em `game/application/README.md`.
- **Tela por assento (feito em 11/11/2026)**: `viewerControls(view, store.pinnedSeat)` em `features/match/model/matchView/viewer.ts` diz o que esta tela pode fazer agora. Com assento preso, fora da sua vez somem a ampulheta e o botão de pausa, o "Rolar dado" vira "Vez de <nome>…", a mão mostrada é a do assento (cartas, fusão, queimar energia, habilidade e Vazio desligados) e as perguntas (descarte, Pilhagem, dádiva, armadilha do Zarek) só aparecem para quem responde. No jogo local (`null`) tudo fica igual. Para testar: `/partida?jogadores=witch,zarek&assento=p2` (só em `npm run dev`); como o outro assento não tem tela, a partida para na vez dele (`assento=p1` joga a primeira vez antes).
- **Ficou de fora**: o relógio continua na tela (para nas animações e pausas, que só ela vê) e só manda o `forfeitTurn` do próprio assento; o prazo do servidor para quem cair nasce com o `WebSocketGameClient`.

## 4. Contrato TS ↔ Python ✅

- Fonte única no TS: JSON Schema gerado dos `GameCommand` (e do `GameUpdate`).
- No Python, modelos Pydantic gerados do schema (`datamodel-code-generator`).
- O FastAPI trata `state` e `events` como JSON opaco; "quem pode agir" e a projeção ficam no Node.
- CI falha se o schema gerado mudar sem ser commitado.
- **Feito em 11/11/2026**: `contracts/game.schema.json` na raiz, gerado com `ts-json-schema-generator` por `npm run schema` (em `frontend/`) a partir de `game/application/contract.ts`. Tem `GameCommand`, `CommandResult`, `GameErrorCode`, `SnapshotMessage` e `GameUpdateMessage`; `state` e `events` saem como `OpaqueJson`, então mudar uma regra não mexe no contrato.
- **Fluxo**: muda o tipo no TS → `npm run schema` → commita o schema junto → no backend, `uv run datamodel-codegen ...` regenera `app/contracts/game.py`. Comando completo e opções em [contracts/README.md](../contracts/README.md).
- **CI**: roda `npm run schema` e falha com `git diff --exit-code` se o arquivo mudou. Na máquina: `npm run schema:check`.

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
