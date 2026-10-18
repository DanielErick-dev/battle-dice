# Documentação do Battle Dice

## Visão geral (`docs/`)
- [Regras do jogo](regras.md): o livro de regras completo e a ficha de cada personagem
- [Arquitetura](arquitetura.md): camadas, o fluxo de uma jogada e o pipeline de assets
- [Decisões (ADRs)](decisoes/README.md): o porquê das escolhas grandes
- [Plano de refatoração](plano-refatoracao.md): diagnóstico, etapas e diário
- [Assets 3D](assets.md): padrão de nomes e como gerar os modelos
- [Banco de ideias](ideias.md): o que ainda não virou decisão

## Por módulo (README dentro da pasta)
- [game/domain](../frontend/src/game/domain/README.md): as regras do jogo
- [game/application](../frontend/src/game/application/README.md): a porta entre a tela e o jogo (multiplayer)
- [match/model](../frontend/src/features/match/model/README.md): o store e a MatchView (o "cérebro" da tela)
- [match/audio](../frontend/src/features/match/audio/README.md): som sintetizado
- [match/model/playback](../frontend/src/features/match/model/playback/README.md): eventos → animação
- [match/ui/abilities](../frontend/src/features/match/ui/abilities/README.md): o que o botão "Usar" faz
- [match/scene](../frontend/src/features/match/scene/README.md): o mundo 3D

## Sugestão de leitura
1. `arquitetura.md`, a seção "O fluxo de uma jogada"
2. `game/domain/README.md`
3. `game/application/README.md`
4. `decisoes/001` e `002`
5. `ui/abilities/README.md`, depois o código de `hellsDrag.tsx` (25 linhas)
