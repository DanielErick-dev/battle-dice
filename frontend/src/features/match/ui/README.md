# match/ui: o HUD da partida

HTML e CSS por cima da cena 3D. Lê a `MatchView` e manda cliques para o `matchStore`.

| Pasta ou arquivo  | O que tem                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------- |
| `MatchScreen.tsx` | Monta a tela. A lógica fica em `screen/`.                                                                     |
| `screen/`         | Hooks da tela (`useAbilityUse`, `useCameraChoice`, `useMatchClock`) e os painéis maiores dela.                |
| `abilities/`      | O que "Usar" faz em cada habilidade que pergunta algo. Tem README próprio.                                    |
| `battleLog/`      | O texto do log: um mapa tipado `evento → linha`, um arquivo por tema, como em `model/playback/`.              |
| `hud/`            | Dado, jogadores, ampulheta, banner. O texto do banner fica em `hud/effectCopy/`, um arquivo por tema.         |
| `cards/`          | Mão, overlays e cartas. A arte desenhada fica em `cards/art/`, um arquivo por dono.                           |

## Personagem ou evento novo

Os registros são exaustivos: o TypeScript acusa o que falta.

- Evento novo: uma entrada em `battleLog/<tema>.ts` (ou em `silent.ts`, se ele não aparece no log).
- Efeito novo (`TileEffectKind`): uma entrada em `hud/effectCopy/<tema>.ts`.
- Carta nova: uma entrada em `cards/art/<dono>.tsx` e uma cor em `CARD_PALETTE`.

## Testes de texto

`EffectBanner.test.ts`, `battleLog.characterization.test.ts` e `CardArt.test.ts` guardam a saída atual em snapshots, um caso por ramo.
Se um texto mudar de propósito, rode `npx vitest run -u` e confira o diff do snapshot.
