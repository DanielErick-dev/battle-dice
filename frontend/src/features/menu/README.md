# menu: telas fora da partida

O menu principal, a tela de montar a partida (modo, jogadores, personagens) e as configurações. O destaque é o **palco**: o personagem escolhido aparece em 3D, faz a intro dele uma vez e depois fica em pose. Dá para arrastar para girar e clicar para repetir a intro.

## `ui/`: as telas (HTML/CSS)

| Arquivo | O que faz |
|---|---|
| `HomeScreen.tsx` | Menu principal (`/`): botões e o personagem escolhido no palco |
| `MatchSetupScreen.tsx` | Nova partida (`/jogar`): modo, jogadores, personagem de cada um, modo teste |
| `SettingsScreen.tsx` | Configurações (`/configuracoes`): som, música, qualidade dos efeitos |
| `MenuShell.tsx` | O céu noturno de fundo e o "esqueleto" das páginas secundárias (voltar + título) |

## `stage/`: o palco 3D (React Three Fiber)

| Arquivo | O que faz |
|---|---|
| `CharacterStage.tsx` | O canvas: luzes, câmera, chão (pedestal ou cenário) e o personagem |
| `LazyCharacterStage.ts` | Carrega o palco só no navegador (WebGL não existe no servidor) |
| `Presentation.tsx` | O personagem em si: toca a intro, os efeitos dela e depois a pose de vitrine |
| `Turntable.tsx` | Arrastar para girar e clicar para repetir a intro |
| `RunePedestal.tsx` | O pedestal padrão com runas girando |
| `RisingMotes.tsx` | Partículas de luz subindo em volta |
| `StageShake.tsx` | Treme a câmera com o vento das asas do Seraphiel |
| `seraphEntrance.ts` | Os tempos da entrada do Seraphiel: batidas de asa e rajadas de vento (tem teste) |
| `WindGusts.tsx` | Penas e brilhos que saem das pontas das asas a cada batida |
| `layout.ts` | Altura do personagem e onde fica o chão |
| `scenery/` | Cenários próprios dos personagens no lugar do pedestal: `Graveyard` (Necromante), `FrozenWastes` (Bjorn), `Sanctuary` (Seraphiel), `Scriptorium` (Escriba), `MoonlitShore` (Nerissa: praia ao luar, água rasa com espuma, santuário partido), `SunkenTemple` (Auric: templo dourado submerso, corais, cáusticas e bolhas), `GearWorks` (Cronos: engrenagens que giram engatadas no chão, anel de algarismos cujos ponteiros às vezes voltam), `HangarBay` (Unidade Alva: plataforma de lançamento hexagonal com varredura nas juntas e mira holográfica). `canvasTexture.ts` pinta texturas em canvas, com o esmaecer até a borda. O `index.ts` é o registro (`SCENERY`): cenário novo = um arquivo + uma linha lá + `stage` na ficha do personagem. Cada entrada também diz se o palco fica escuro (`dim`), a cor da luz (`light`) e se tem clima próprio (`weather`, que desliga as partículas). `noiseTexture.ts` desenha as texturas granuladas (terra, neve, pedra, mármore) |

Os efeitos de cada intro (lâminas, cartas, ossos, gelo…) vêm de `features/match/scene/character/`, os mesmos da partida. A ficha de cada personagem (`features/match/characters.ts`) diz qual cenário e quais efeitos ele usa.

## `audio/`

| Arquivo | O que faz |
|---|---|
| `stageSounds.ts` | Sons das intros (chão quebrando, descida do céu, batida de asa), sintetizados como os da partida |
| `useStageSounds.ts` | Cria o motor de áudio do palco e respeita o mudo global |
