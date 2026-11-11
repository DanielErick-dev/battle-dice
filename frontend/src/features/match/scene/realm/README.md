# scene/realm: o céu e o inferno

Quando alguém entra num portal, a partida ganha um **reino**: o infernal (fogo, lava) ou o celestial (luz, mármore).
Esta pasta desenha a passagem para o reino, o corredor dele ao lado do tabuleiro e a mudança de clima do mundo todo.

## Entrada

| Arquivo | O que faz |
|---|---|
| `RealmAtmosphere.tsx` | Envolve a cena. Mistura o mundo aos poucos com o reino de quem a câmera segue e repinta o fundo, a névoa e as luzes de preenchimento (são as luzes da cena, não luzes novas) |
| `RealmTrackView.tsx` | O corredor do reino: as casas sobem da lava ou descem do céu, uma a uma a partir do portal, ligadas por uma fita de energia; as paredes crescem junto; tudo afunda quando ninguém está nele |
| `RealmGate.tsx` | O portal se abrindo (monte com uma `key` nova a cada entrada): um poço com fogo subindo, ou uma coluna de luz caindo sobre um selo |
| `RealmParticles.tsx` | Brasas subindo, ou poeira de luz e raios de sol, em volta da arena |
| `glsl.ts` | Pedaços de shader compartilhados: `NOISE_GLSL` (ruído e fbm, usado também pelo céu e pelo oceano) e `UV_VERTEX` |

## Pastas

| Pasta | O que tem |
|---|---|
| `mix/` | A **mistura de reinos** (`RealmMix`: quanto de inferno e de céu aparece agora, de 0 a 1). `realmMix.ts` (`stepRealmMix`, que anda a mistura a cada quadro, e `blendRealm`, que mistura três cores por ela, com teste), `useRealmMix.ts` (o contexto que o céu, o oceano e as partículas leem) e `palette.ts` (as cores do céu e das luzes por reino) |
| `track/` | As peças do corredor que acompanham cada casa: `arrival.ts` (quando cada casa chega e quanto as paredes subiram, com teste), `FlameWall.tsx`, `TrackUndersides.tsx` (estalactites de lava ou auréola dourada embaixo da casa), `TrackSparkles.tsx` e `ribbonShader.ts` (a fita de energia) |
| `corridor/` | As paredes: `CorridorWalls.tsx` escolhe entre `InfernalPassage.tsx` (passagem estreita de basalto com veios de lava) e `CelestialCloister.tsx` (claustro aberto de mármore com arcos de ouro). `Pillar.tsx`, `LavaCrack.tsx` e `layout.ts` (onde o corredor começa e termina, onde ficam os pilares, o zigue-zague das rachaduras; com teste) |
| `gate/` | `shaders.ts` (fogo, poço, coluna de luz e selo) e `timeline.ts` (abre, segura e fecha; com teste) |
| `particles/` | `Drift.tsx` (uma nuvem de partículas subindo), `LightShafts.tsx` (raios de sol), `layout.ts` (onde cada partícula e cada raio começam, com teste) e `shaders.ts` |

## Como a mistura funciona

A `RealmAtmosphere` guarda a mistura numa `ref` e a atualiza dentro do `useFrame`, sem re-renderizar.
Quem precisa dela (o céu, o oceano, as estrelas, as partículas) chama `useRealmMix()` e lê `mix.current` no próprio `useFrame`.
As cores são misturadas com `blendRealm` direto nos uniforms e materiais, nunca nas constantes de `palette.ts`.

## Cuidados

- **Sem luzes novas.** A luz da lava já existe (com intensidade 0 fora do inferno); o resto brilha com emissivo e bloom.
- **Escala nunca zero:** as paredes crescem a partir de 0.001 (`wallRise`), para o bloom não espalhar NaN.
