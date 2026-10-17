# match/audio: som da partida

Quase todo o som é **sintetizado no navegador** (Web Audio API), sem arquivos de áudio. Só as falas dos personagens são gravações.

| Arquivo | O que faz |
|---|---|
| `audioEngine.ts` | O contexto de áudio e os canais (efeitos, música, ambiente) com volume e mudo |
| `synth.ts` | Blocos para criar sons: osciladores, ruído, envelopes |
| `soundEffects.ts` | Cada efeito do jogo (dado, passo, armadilha…) montado com o `synth` |
| `music.ts` | A música de fundo, gerada nota a nota |
| `ambience.ts` | O ambiente (braseiros estalando, mar) |
| `voices.ts` | Falas dos personagens: arquivos em `public/audio/voices/` |
| `matchAudio.ts` | Decide **qual** som tocar a partir das mudanças da `MatchView` |

Quem liga isso à tela são os hooks `useGameAudio` (cria o motor) e `useMatchAudio` (escuta a view), em `../hooks/`.
