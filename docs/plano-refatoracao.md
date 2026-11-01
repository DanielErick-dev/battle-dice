# Plano de refatoração

Começou em 17/10/2026. Cada etapa é pequena, mantém os testes verdes e vira um commit próprio.
Marque com ✅ ao terminar e anote o porquê de cada decisão.
O status de cada pasta (o que já foi organizado e o que falta) está em [refatoracao-status.md](refatoracao-status.md).

## Diagnóstico

A base é boa: as regras são puras e testadas (281 testes), e o `GameClient` já está pronto para o multiplayer.
O problema é de **crescimento**. Com 20 personagens, alguns arquivos viraram "centrais telefônicas" onde todo personagem novo precisa mexer:

| Arquivo | Linhas | Sintoma |
|---|---|---|
| ~~`features/match/model/playback.ts`~~ | 1275 | ~~um único `switch` com 63 casos~~ ✅ etapa 1 |
| ~~`features/match/scene/PlayerToken.tsx`~~ | 718 → 473 | ~~todos os efeitos de todos os personagens~~ ✅ etapa 4 |
| ~~`features/match/ui/MatchScreen.tsx`~~ | 657 → 409 | ~~`ability === "…"` repetido~~ ✅ etapa 2 |
| ~~`features/match/scene/BoardScene.tsx`~~ | 615 → 287 | ~~42 imports~~ ✅ etapa 4 |
| ~~`features/match/model/matchView.ts`~~ | 409 → 386 | ~~`MatchView` com 38 campos~~ ✅ etapa 3 |
| `features/match/characters.ts` | 460 | ficha visual de 20 personagens num arquivo só |
| ~~`game/domain/engine.ts`~~ | 600 → 44 | ~~roteador de comandos crescendo~~ ✅ etapa 6 |

**Princípio que vamos aplicar:** *aberto para extensão, fechado para modificação*. Adicionar o personagem 21 deveria significar **criar arquivos novos**, não editar 7 arquivos centrais.

## Etapas

### 0. Documentação base ✅
`docs/arquitetura.md`, este plano, `docs/ideias.md`, `CLAUDE.md`.

### 1. Quebrar o `playback.ts` por tema ✅
- `model/playback/` com `index.ts` (o roteador), `types.ts`, `helpers.ts` e um arquivo por tema: `turn`, `tiles`, `cards`, `abilities` e um por personagem com eventos próprios (`berserker`, `kunoichi`, `fairy`, `seraph`, `specters`, `seals`, `arrowRain`, `cardGamble`), com os mesmos nomes dos arquivos do domínio.
- O roteador virou um **mapa tipado** `StepHandlers<GameEvent["type"]>`: cada evento aponta para a função que o anima. O TypeScript exige uma entrada para cada evento (o `switch` antigo também exigia, pelo tipo de retorno; o ganho aqui é de organização, não de segurança).
- **Por quê:** para entender ou mexer na animação de um personagem, abre-se um arquivo de ~100 linhas em vez de rolar 1275. Personagem novo = arquivo novo + uma linha no `index.ts`.
- Feito com um script que cortou o `switch` automaticamente (sem copiar e colar à mão); os 281 testes passaram sem alteração.

### 2. Seletores de alvo das habilidades fora da `MatchScreen` ✅
- Nova pasta `ui/abilities/`: cada habilidade que pergunta algo antes de ser usada tem um arquivo que exporta um `AbilityFlow`:
  - `start(scene)`: o que o botão "Usar" faz primeiro: `"picker"` (abre o seletor), `"seals" | "specters" | "flames"` (escolher casas no tabuleiro) ou `null` (usa direto);
  - `Picker`: o componente do seletor, que recebe um `ctx` com `use(choice)`, `place(placement)` e `cancel()`.
- `ui/abilities/index.ts` tem o registro `ABILITY_FLOWS`. A `MatchScreen` só faz `ABILITY_FLOWS[ability]`.
- Os 3 tipos de colocação em casas (selos, aparições, fogo negro) foram para `placements.ts`. O `placementOf` devolve a **escolha** (`{ sealTiles }`) em vez de chamar o store, então a interface monta o comando e quem envia é a tela.
- O estado interno do Cronos (escolher o poder antes do alvo) virou `useState` dentro do próprio seletor dele. Antes era um estado da `MatchScreen` inteira só para isso.
- Removidas do domínio `needsCardChoice`, `needsSealPlacement` e `needsSpecterPlacement`: eram perguntas de interface ("abre seletor?") morando nas regras. `needsDiscardChoice` ficou, porque a regra da Ressurreição usa.
- **Por quê:** a tela da partida não conhece mais nenhuma habilidade. Personagem novo com seletor = um arquivo em `ui/abilities/` + uma linha no registro. `MatchScreen`: 657 → 409 linhas.
- **Ligação com o backend:** o seletor produz um `AbilityChoice`, que é exatamente o payload do comando `activateAbility`, o mesmo JSON que vai pelo WebSocket. As listas de alvos vêm de funções do domínio (`gambleTargets`, `dragTargets`), que o servidor também vai rodar para validar.

### 3. Agrupar os campos de efeito da `MatchView` ✅
- Novo sub-objeto `view.fx` (tipo `MatchFx`) com as 10 animações que estão tocando: `cast`, `drawing`, `fusing`, `transmuting`, `dash`, `volley`, `tide`, `trample`, `drag`, `frostStream`. Cada uma tem seu tipo (`DashView`, `TrampleView`…) e um `id` que muda a cada vez.
- No topo ficou o que é de todos e dura: jogadores, vez, dado (`roll`, `lastRoll`), banner (`effect`), perguntas pendentes e o que está desenhado no tabuleiro (selos, aparições, chamas, inverno, armadilhas).
- **Critério da divisão:** vai para o `fx` o que o `syncStep` nunca toca, ou seja, o que só existe na tela. `roll` ficou no topo porque o dado é de todos e o HUD lê junto com `lastRoll`; `lastDrawnUid` ficou porque é o destaque da mão, não uma animação.
- Os handlers escrevem com `withFx(view, { … })` e `nextFxId(view.fx.x)`, em vez de repetir `{ ...view, x: { id: (view.x?.id ?? 0) + 1, … } }`. A revelação de carta (`cardDrawn`, `cardsResurrected`) virou um helper só, `revealThenDeal`.
- **Por quê:** quem lê a `MatchView` vê em 30 linhas o que é estado de jogo e o que é animação. Animação nova = um tipo + um campo no `MatchFx`, sem misturar com as regras. Os testes só mudaram o caminho (`view.trample` → `view.fx.trample`).
- **Ligação com o backend:** o `fx` nunca vai para o servidor. O que vem do backend (o `GameState`) só alimenta o topo, pelo `syncStep`; o `fx` é montado aqui no cliente a partir dos eventos. Assim o contrato do WebSocket não carrega nada de animação.

### 4. Efeitos por personagem fora do `PlayerToken` e da `BoardScene` ✅
- Nova pasta `scene/effects/`: cada efeito tem uma "regra de montagem" (um componente pequeno que decide se aparece e com quais props), num arquivo por dono (`berserker.tsx`, `fairy.tsx`, `seraph.tsx`, `cards.tsx`…).
- `effects/index.ts` tem o registro, em listas por lugar: `TOKEN_EFFECTS.aura | ground | body | figure` (no boneco) e `BOARD_EFFECTS` / `OVERLAY_EFFECTS` (no tabuleiro, antes e depois dos bonecos). O `PlayerToken` e a `BoardScene` só fazem `.map` nessas listas.
- Os efeitos recebem um contexto: `TokenFx` (jogador, ficha, cor, sinais e as refs do quadro a quadro) ou `BoardFx` (view, tabuleiro, layout, quem olha).
- O `PlayerToken` agora recebe `player`, `character` e `signals`, em vez de ~45 props soltas. O que cada boneco está fazendo saiu da `BoardScene` para `tokenSignals.ts`; onde ele fica, para `tokenPlacement.ts`; o foco da câmera e do dado, para `cameraFocus.ts`.
- **Ficou de fora, de propósito:** o movimento e a escolha de clipe do `PlayerToken` (correr, saltar, ser arrastado, empurrar) continuam num `useFrame` só, porque um passo depende do outro. A cadeira, o anel e o nome são de todos e ficaram no `PlayerToken`. Câmera, ambiente e casas ficaram na `BoardScene`.
- **Ordem:** as listas seguem a ordem do JSX antigo, então os mesmos componentes montam nas mesmas condições e na mesma ordem. A única mudança de posição foi o frasco da Alquimista (`VialThrow`), que agora fica antes do modelo no grupo do corpo; ele só monta depois de um lançamento, então a ordem de criação continua a mesma.
- **Por quê:** efeito novo de personagem = um componente + uma linha no registro, sem abrir o `PlayerToken` (que tem uma máquina de estados delicada) nem a `BoardScene`. `PlayerToken` 718 → 473 linhas; `BoardScene` 615 → 287 linhas, 42 → 29 imports.
- **Ligação com o backend:** nenhuma regra mudou de lugar: os efeitos só leem a `MatchView` (o que o servidor mandou, já animado pelo playback). No online, cada cliente desenha os mesmos efeitos a partir dos mesmos eventos.
- A etapa 5 pode levar as flags da ficha (`wand`, `wings`, `castAura`…) para o arquivo de cada personagem junto com as regras de `effects/`.

### 5. Uma ficha por personagem
- `features/match/characters/<id>.ts` reunindo modelo, clipes, cores, efeitos e intro; `characters/index.ts` monta o elenco.

### 6. Revisar o `engine.ts` ✅
- Mesmo padrão da etapa 1: `domain/handlers/` com um arquivo por tema (`turnCommands`, `cardCommands`, `abilityCommands`), `shared.ts` (`assertCanAct`, `settle`), `setup.ts` (montar a partida) e `index.ts` com o mapa tipado `CommandHandlers<GameCommand["type"]>`.
- A fila de `if (ability === …)` do `activateAbility` virou o registro `ABILITY_EFFECTS`: habilidade → função.
- `createGame` e `restart` agora usam o mesmo `openingState`, em vez de repetir os 20 campos do estado inicial.
- `engine.ts` continua exportando `createGame`, `currentPlayer` e `applyCommand` com as mesmas assinaturas: ninguém fora do domínio mudou.
- **Por quê:** o engine era o último roteador central. Comando novo = handler no arquivo do tema; habilidade nova = uma linha em `ABILITY_EFFECTS`. `engine.ts`: 600 → 44 linhas; os 281 testes passaram sem alteração.

### 7. Testes do domínio por tema ✅
- Os "sacos de gatos" `engine.test.ts`, `abilities.test.ts` e `cards.test.ts` foram quebrados: cada arquivo de teste fica ao lado do módulo que testa (`deck`, `turn`, `cardPlay`, `fusion`, `landing`, `arrowRain`, `cardGamble`, `trapWard`, `transmutation`, `resurrection`…). `cards.test.ts` deixou de existir.
- Nova pasta `domain/testing/`: `newGame` (partida a partir de um mapa `id → habilidade`), `withPlayer`/`withPlayers`, `playerOf`, `onTurnOf`, `readyAbility`, `send`/`roll`/`activate`/`play`/`discard` com dado viciado, `card`/`cards`/`copies`, `hasEvent`/`eventsOfType`, `expectRuleError` e tabuleiros prontos em `boards.ts`.
- Os outros testes (`berserker`, `blessings`, `fairyKunoichi`, `hiddenTraps`, `newcomerAbilities`, `realms`, `seals`, `seraph`, `specters`) trocaram as suas cópias de `patch`/`send`/`player`/`expectRuleError` pelos helpers. O Susanoo da Kage foi para `fairyKunoichi.test.ts`; dois testes repetidos em `newcomerAbilities` ficaram só em `abilities.test.ts`.
- **Por quê:** teste novo = abrir o arquivo do tema e usar os helpers, sem copiar 40 linhas de preparação. Nenhum teste foi perdido: 281 antes e 281 depois, com as mesmas asserções.

### Depois da refatoração
- Deploy na Vercel.
- Contrato do multiplayer: documentar `GameCommand`/`GameEvent` como o protocolo do WebSocket (base para o backend FastAPI).

## Diário

| Data | Etapa | O que mudou e por quê |
|---|---|---|
| 17/10 | 0 | Commits divididos (assets, kits, lab). Docs criadas. |
| 17/10 | 1 | `playback.ts` (1275 linhas, 63 casos) → `model/playback/` com 12 arquivos temáticos. |
| 17/10 | 2 | Seletores das habilidades → registro `ui/abilities/` (9 habilidades). `MatchScreen` 657 → 409 linhas. |
| 17/10 | 3 | 10 campos de animação da `MatchView` → `view.fx` (`MatchFx`), com `withFx`/`nextFxId`. `matchView.ts` 409 → 386 linhas. |
| 17/10 | 4 | Efeitos 3D → registro `scene/effects/` (42 regras em 16 arquivos). `PlayerToken` 718 → 473, `BoardScene` 615 → 287 linhas. |
| 17/10 | 6 | `engine.ts` (600 linhas) → `domain/handlers/` com mapa tipado por comando e registro `ABILITY_EFFECTS`. Passada de limpeza nos comentários de `game/`. |
| 18/10 | 7 | Testes de `domain/` → um arquivo por tema, com helpers em `domain/testing/`. `cards.test.ts` (604 linhas) dividido; 281 testes mantidos. |
| 01/11 | — | Fim dos 3 agentes de 29/10, juntados no `main`. `game/domain/` (60 arquivos soltos) → `core/`, `board/`, `cards/`, `abilities/`, `characters/<nome>/`; os números de cada habilidade foram morar com a mecânica do personagem. `scene/character/` (48 arquivos) → `core/`, `accessories/`, `shared/` + uma pasta por personagem. Cenários do menu → uma pasta por habitat com `textures`/`layout`/peças. Nenhum comportamento mudou; 409 testes verdes. |
