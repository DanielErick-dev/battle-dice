# Status da refatoração por pasta

Mapa de quais pastas já foram remodeladas, organizadas e revisadas, e quais ainda não.
A ideia é refatorar aos poucos, uma pasta por vez, sempre com os testes verdes e sem mudar nada no visual.
O histórico detalhado de cada etapa (o porquê das decisões) fica em [plano-refatoracao.md](plano-refatoracao.md).

**Legenda:**
- ✅ organizada: revisada, estrutura boa, só manter o padrão.
- 🟡 parcial: parte já foi feita, falta o que está anotado.
- 🔄 em andamento: alguém (pessoa ou agente) está mexendo agora.
- ⬜ não revisada: nunca passou por refatoração.

Linhas = código da própria pasta (sem subpastas e sem testes), contadas em 29/10/2026.

## `frontend/src/game/` (regras, TypeScript puro)

| Pasta | Status | Linhas | Feito | Falta |
|---|---|---|---|---|
| `game/domain/` | 🟡 | 7678 | Testes por tema (etapa 7). `engine.ts` virou roteador (etapa 6). | Pasta plana com ~60 arquivos: agrupar por tema (ex.: `domain/characters/`, `domain/board/`, `domain/cards/`). |
| `game/domain/handlers/` | ✅ | 492 | Mapa tipado por comando, registro `ABILITY_EFFECTS` (etapa 6). | |
| `game/domain/testing/` | ✅ | 151 | Helpers de teste compartilhados (etapa 7). | |
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
| `match/scene/` (raiz) | 🔄 | 4710 | Efeitos fora do `PlayerToken`/`BoardScene` (etapa 4). | Agente refatorando o `PlayerToken.tsx` (571 linhas) e os sinais do boneco (29/10). |
| `match/scene/effects/` | ✅ | 801 | Registro de efeitos por lugar (etapa 4). | |
| `match/scene/character/` | ⬜ | 9252 | | A maior bagunça: 48 arquivos misturando o genérico (`CharacterModel`, `props`, `worldPlacement`) com efeitos de cada personagem (`Susanoo`, `AlchemyVial`, `ScribeIntro`…). Separar em subpastas por personagem. |
| `match/scene/environment/` | ⬜ | 2474 | Mapas escurecidos e sem figurantes (29/10, só visual). | Revisar a estrutura. |
| `match/scene/realm/` | ⬜ | 1124 | | Revisar. |
| `match/scene/vfx/` | ⬜ | 58 | | Revisar. |

## Outras features

| Pasta | Status | Linhas | Feito | Falta |
|---|---|---|---|---|
| `features/menu/` (raiz) | ✅ | 0 | README. | |
| `features/menu/stage/` | 🟡 | 839 | | Revisar. |
| `features/menu/stage/scenery/` | 🟡 | 8665 | Helpers juntados em `textures.ts` e `sceneryKit.ts` (`9ccf2aa`). | Cada habitat ainda tem 450–540 linhas: extrair mais peças em comum. |
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
| `frontend/scripts/props/` | 🟡 | A saída segue a pasta de cada personagem (29/10). | `build-kits.mjs` ainda monta os NPCs, que saíram do jogo. |
| `public/models/characters/` | ✅ | Um `.glb` por personagem, com o id do código. | |
| `public/models/props/` | ✅ | Uma pasta por personagem, com os mesmos nomes da fonte (29/10). | |
| `public/models/island/` | 🟡 | Kits dos mapas. | `npcs/` (2,3 MB) não é mais usado desde 29/10: apagar. |
| `docs/` | ✅ | Docs em português, com índice no README. | Manter em dia a cada mudança. |

## Como usar

1. Escolha uma pasta ⬜ ou 🟡 e marque 🔄 com a data.
2. Refatore sem mudar comportamento nem visual. Rode `npm run typecheck && npm run lint && npm test && npm run build`.
3. Atualize a linha da tabela (status, linhas, feito e falta) e, se for uma etapa grande, registre no diário do [plano-refatoracao.md](plano-refatoracao.md).
