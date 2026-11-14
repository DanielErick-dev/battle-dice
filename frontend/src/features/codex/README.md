# codex: a tela Personagens

Rota `/personagens`, aberta pelo botão **Personagens** do menu principal.

- `CharactersScreen.tsx`: a lista dos personagens, o palco 3D do escolhido (o mesmo do menu) e quatro abas:
  - **Estilo**: o papel e como o personagem vence;
  - **Habilidade**: nome, carga e a descrição de `shared/text/abilityText.ts`;
  - **Cartas**: as cartas exclusivas dele, desenhadas com o `CardView` da partida;
  - **Dicas**: as dicas de jogo.
- O texto de estilo e as dicas ficam em `features/characters/guide.ts` (um por personagem; o tipo obriga a ter todos).

`codex` importa `menu` (o palco) e `match` (as cartas); ninguém importa `codex`.
