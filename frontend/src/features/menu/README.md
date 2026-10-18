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
| `scenery/` | Os cenários próprios de cada personagem no lugar do pedestal (tabela abaixo). O `index.ts` é o registro (`SCENERY`): cenário novo = um arquivo + uma linha lá + `stage` na ficha do personagem. Cada entrada também diz se o palco fica escuro (`dim`), a cor da luz (`light`) e se tem clima próprio (`weather`, que desliga as partículas). `textures.ts` reúne todas as texturas de canvas: `useCanvasTexture` pinta uma textura a partir de uma função `Painter` de módulo (com semente, esmaecer até a borda, repetição e altura opcionais), `useCanvasTextures` faz várias de uma vez e `useNoiseTexture` desenha as granuladas (terra, neve, pedra, mármore); `sceneryKit.ts` reúne a geometria: tubos afunilados (raízes, troncos), rochas amassadas (`roughen`), tufos de grama, `scatterAround` (espalha objetos sem tapar os pés) e o plano que corta o que fica abaixo do chão |

### Cenários (`stage/scenery/`)

| Arquivo | Personagem | O que tem |
|---|---|---|
| `Graveyard` | Necromante | Cemitério |
| `FrozenWastes` | Bjorn | Neve, cristais de geleira, rochas e nevasca |
| `Sanctuary` | Seraphiel | Altar de mármore sobre nuvens, colunas, penas e raios de luz |
| `Scriptorium` | Escriba da Carne | Lajes de pedra, velas, páginas espalhadas e livros |
| `VoidRift` | Cavaleiro do Vazio | Obsidiana rachada com fendas violeta pulsando, lascas flutuando e um vórtice de névoa escura |
| `MistRuins` | Guardião das Sombras | Ruínas ao luar, colunas quebradas, névoa rasteira e fogos-fátuos |
| `BurningShrine` | Kage Rubra | Pátio de santuário chamuscado com torii, lanternas de pedra, fogo negro e brasas subindo |
| `BloodRoseGarden` | Encantadora Carmesim | Círculo de sangue sobre terra escura, roseiras, vinhas com espinhos, candelabros e pétalas caindo |
| `MoonlitShore` | Nerissa | Praia ao luar, água rasa com espuma, santuário partido |
| `SunkenTemple` | Auric | Templo dourado submerso, corais, cáusticas e bolhas |
| `GearWorks` | Cronos | Engrenagens engatadas girando no chão, anel de algarismos cujos ponteiros às vezes voltam |
| `HangarBay` | Unidade Alva | Plataforma de lançamento hexagonal com varredura nas juntas e mira holográfica |
| `WitchHollow` | Bruxa Carmesim | Chão de floresta escura, raízes retorcidas, cogumelos vermelhos, anel de pedras e caldeirão borbulhando sobre o fogo |
| `AlchemyLab` | Alquimista Esmeralda | Piso de ardósia, círculo de transmutação brilhando, bancada com frascos verdes borbulhando e alambique de latão |
| `CardTable` | Coringa Carmesim | Piso arlequim carmesim e preto, cartas espalhadas e flutuando, fichas, dados e lâmpadas de circo piscando |
| `SakuraCourtyard` | Akane | Pátio de pedra, cerejeira com pétalas caindo, cadernos abertos e lanterna de pedra |
| `ElvenGlade` | Arqueira Élfica | Chão de musgo, raízes e tronco caído, samambaias, cogumelos brilhando, alvo de palha com flechas e vaga-lumes |
| `CrystalGrove` | Fada Cristalina | Neve sobre musgo, cristais que brilham por dentro (ciano e lilás), anel de flores luminosas e brilhos subindo |
| `WindPeak` | Zéfiro | Topo de montanha com grama dobrando ao vento, os quatro elementos orbitando, folhas em espiral e nuvens abaixo |
| `StormTemple` | Monge Ancião | Terraço de mosteiro, incensário com fumaça, sino de bronze, bandeirinhas de oração e raios ao longe |

Os efeitos de cada intro (lâminas, cartas, ossos, gelo…) vêm de `features/match/scene/character/`, os mesmos da partida. A ficha de cada personagem (`features/match/characters.ts`) diz qual cenário e quais efeitos ele usa.

## `audio/`

| Arquivo | O que faz |
|---|---|
| `stageSounds.ts` | Sons das intros (chão quebrando, descida do céu, batida de asa), sintetizados como os da partida |
| `useStageSounds.ts` | Cria o motor de áudio do palco e respeita o mudo global |
