# Status da refatoração por pasta

Mapa de quais pastas já foram remodeladas, organizadas e revisadas, e quais ainda não.
A ideia é refatorar aos poucos, uma pasta por vez, sempre com os testes verdes e sem mudar nada no visual.
O histórico detalhado de cada etapa (o porquê das decisões) fica em [plano-refatoracao.md](plano-refatoracao.md).

**Legenda:**
- ✅ organizada: revisada, estrutura boa, só manter o padrão.
- 🟡 parcial: parte já foi feita, falta o que está anotado.
- 🔄 em andamento: alguém (pessoa ou agente) está mexendo agora.
- ⬜ não revisada: nunca passou por refatoração.

Linhas = código da própria pasta (sem subpastas e sem testes), contadas em 29/10/2026 (as linhas revisadas em 01/11 contam as subpastas).

## `frontend/src/game/` (regras, TypeScript puro)

| Pasta | Status | Linhas | Feito | Falta |
|---|---|---|---|---|
| `game/domain/` | ✅ | 5316 | Testes por tema (etapa 7). `engine.ts` virou roteador (etapa 6). Agrupada por tema em 01/11: `core/`, `board/`, `cards/`, `abilities/` e `characters/<nome>/` (mecânica, números de balanceamento e tipos de cada personagem). `types.ts` virou só a vitrine de tipos para `features/`. | `cards/play.ts` (313) e `characters/zarek/void.ts` (~290) ainda passam um pouco das 250 linhas. |
| `game/domain/handlers/` | ✅ | 501 | Mapa tipado por comando, registro `ABILITY_EFFECTS` (etapa 6). | |
| `game/domain/testing/` | ✅ | 154 | Helpers de teste compartilhados (etapa 7). | |
| `game/application/` | ✅ | 45 | `GameClient` e `LocalGameClient`, com README. | |

## `frontend/src/features/match/` (a partida)

| Pasta | Status | Linhas | Feito | Falta |
|---|---|---|---|---|
| `match/` (raiz) | ⬜ | 807 | | `characters.ts` (528 linhas) com a ficha de 20 personagens: etapa 5, uma ficha por personagem. |
| `match/model/` | ✅ | 1178 | `view.fx` separado do estado de jogo (etapa 3). | |
| `match/model/playback/` | ✅ | 1720 | Um arquivo por tema, mapa tipado de eventos (etapa 1). | |
| `match/audio/` | ⬜ | 991 | Tem README. | Revisar. |
| `match/hooks/` | ⬜ | 107 | | Revisar. |
| `match/ui/` | 🟡 | 1130 | `MatchScreen` sem lógica de habilidade (etapa 2). | `MatchScreen` ainda com 409 linhas. |
| `match/ui/abilities/` | ✅ | 433 | Registro `ABILITY_FLOWS` (etapa 2). | |
| `match/ui/cards/` | ⬜ | 1416 | | Revisar. |
| `match/ui/hud/` | ⬜ | 1423 | | Revisar. |
| `match/scene/` (raiz) | ✅ | 4380 | Efeitos fora do `PlayerToken`/`BoardScene` (etapa 4). `PlayerToken` 571 → 243 linhas: movimento e pose viraram funções puras e testadas em `token/` (29/10). | |
| `match/scene/token/` | ✅ | 538 | Criada em 29/10: `motion.ts` (caminho e segmentos) e `pose.ts` (qual clipe toca), com 41 testes. | |
| `match/scene/effects/` | ✅ | 801 | Registro de efeitos por lugar (etapa 4). | |
| `match/scene/character/` | ✅ | 9442 | `clipPlayback.ts` testado (29/10). Separada em 01/11: `core/` (modelo, ossos, props, mão), `accessories/` (asas, coroa, cadeira), `shared/` (texturas, hash, brilho) e uma pasta por personagem; contas puras com teste (`frostSlamLayout`, `limbBolts`, `levitation`, `verdictTimeline`). Tem README. | `ScribeIntro`, `SealScroll` e `TidalWave` ainda com ~340 linhas. |
| `match/scene/environment/` | ⬜ | 2474 | Mapas escurecidos e sem figurantes (29/10, só visual). | Revisar a estrutura. |
| `match/scene/realm/` | ⬜ | 1124 | | Revisar. |
| `match/scene/vfx/` | ⬜ | 58 | | Revisar. |

## Outras features

| Pasta | Status | Linhas | Feito | Falta |
|---|---|---|---|---|
| `features/menu/` (raiz) | ✅ | 0 | README. | |
| `features/menu/stage/` | 🟡 | 839 | | Revisar. |
| `features/menu/stage/scenery/` | ✅ | 9404 | Kit em `kit/` (texturas, geometria, chão, movimento, peças prontas, com testes). Em 01/11 cada habitat virou uma pasta: componente principal + `textures.ts` + `layout.ts` + um arquivo por peça. A arte da partida entra só por `kit/matchAssets.ts`. | `WitchHollow.tsx` ainda com 355 linhas (uma cena grande num JSX só). |
| `features/menu/ui/` | ⬜ | 549 | | Revisar. |
| `features/menu/audio/` | ⬜ | 85 | | Revisar. |
| `features/lab/` | ⬜ | 381 | | Playground de VFX: decidir se fica ou sai. |
| `features/settings/` | ⬜ | 98 | | Revisar. |
| `components/ui/` | ⬜ | 204 | | Revisar. |
| `app/` | ⬜ | ~100 | | Rotas do Next: revisar. |
| `lib/` | ⬜ | 49 | | Revisar. |

## Scripts e assets

| Pasta | Status | Feito | Falta |
|---|---|---|---|
| `frontend/scripts/characters/` | ⬜ | | `build-characters.mjs` + `manifest.mjs` (554 linhas): revisar. |
| `frontend/scripts/props/` | 🟡 | A saída segue a pasta de cada personagem (29/10). Passo dos NPCs removido do `build-kits.mjs` (29/10). | Revisar os dois scripts (443 linhas). |
| `public/models/characters/` | ✅ | Um `.glb` por personagem, com o id do código. Ids renomeados para o nome do personagem (`themis`, `zarek`, `necromancer`…) em 29/10. | |
| `public/models/props/` | ✅ | Uma pasta por personagem, com os mesmos nomes da fonte (29/10). | |
| `public/models/island/` | ✅ | Kits dos mapas. `npcs/` (2,3 MB sem uso) apagado em 29/10. | |
| `docs/` | ✅ | Docs em português, com índice no README. | Manter em dia a cada mudança. |

## Como usar

1. Escolha uma pasta ⬜ ou 🟡 e marque 🔄 com a data.
2. Refatore sem mudar comportamento nem visual. Rode `npm run typecheck && npm run lint && npm test && npm run build`.
3. Atualize a linha da tabela (status, linhas, feito e falta) e, se for uma etapa grande, registre no diário do [plano-refatoracao.md](plano-refatoracao.md).
