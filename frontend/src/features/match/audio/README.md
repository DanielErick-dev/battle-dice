# match/audio: som da partida

Quase todo o som é **sintetizado no navegador** (Web Audio API), sem arquivos de áudio. Só as falas dos personagens são gravações.

| Arquivo           | O que faz                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `soundEffects.ts` | Cada efeito do jogo (dado, passo, armadilha…) montado com o `synth`                                                                                                  |
| `music.ts`        | A música de fundo, gerada nota a nota                                                                                                                                |
| `ambience.ts`     | O ambiente (braseiros estalando, mar)                                                                                                                                |
| `voices.ts`       | Falas dos personagens: uma pasta por personagem em `public/audio/voices/<id>/`, arquivos `<id>-<fala>.mp3` (ex.: `themis/themis-intro.mp3`, `zarek/zarek-intro.mp3`) |
| `matchAudio.ts`   | Decide **qual** som tocar a partir das mudanças da `MatchView`                                                                                                       |

O motor (`audioEngine.ts`) e os blocos de síntese (`synth.ts`) ficam em `features/shared/audio/`, porque o menu também os usa.

Quem liga isso à tela são os hooks `useGameAudio` (cria o motor) e `useMatchAudio` (escuta a view), em `../hooks/`.
