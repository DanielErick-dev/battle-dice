# 003: Registros por personagem em vez de `if` central

**Status:** Aceita · **Data:** 17/10/2026

## Contexto
Com 20 personagens, alguns arquivos viraram uma "central" onde todo personagem novo precisava mexer:
- `playback.ts`, com 1275 linhas e um `switch` de 63 casos;
- `MatchScreen.tsx`, com `if (ability === "...")` para cada seletor;
- `PlayerToken.tsx` e `BoardScene.tsx`, com os efeitos de todos.

Mexer num personagem significava navegar por arquivos enormes e arriscar quebrar outro.

## Decisão
Cada personagem ou tema **registra** o que é seu num arquivo próprio, e o arquivo central só consulta o registro:
- `model/playback/`: um arquivo por tema, juntados num mapa `evento → handler` (etapa 1);
- `ui/abilities/`: um `AbilityFlow` por habilidade que pergunta algo, juntados em `ABILITY_FLOWS` (etapa 2);
- a seguir, os efeitos 3D por personagem (etapa 4) e uma ficha por personagem (etapa 5).

Esse é o princípio **aberto/fechado** (o "O" do SOLID): o sistema fica aberto para extensão (arquivo novo) e fechado para modificação (não se edita a central).

## Consequências
- ✅ Personagem novo = arquivos novos + uma linha no registro.
- ✅ Os arquivos são pequenos e fáceis de ler sozinhos.
- ✅ Os mapas tipados fazem o TypeScript avisar quando falta alguma peça.
- ⚠️ Há mais arquivos, então é preciso saber onde procurar. Os READMEs dos módulos resolvem isso.
