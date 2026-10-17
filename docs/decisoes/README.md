# Decisões de arquitetura (ADRs)

Um ADR (*Architecture Decision Record*) é um texto curto que registra **uma decisão importante**:
- o contexto (o problema da época);
- a decisão tomada;
- as consequências (o que ganhamos e o que custou).

Um ADR não se apaga. Se a decisão mudar, escreva um novo que substitui o antigo e marque o antigo como "Substituído por NNN".

| # | Decisão | Status |
|---|---|---|
| [001](001-regras-puras-no-dominio.md) | Regras do jogo puras, separadas da interface | Aceita |
| [002](002-gameclient-porta-multiplayer.md) | `GameClient` como porta para o multiplayer | Aceita |
| [003](003-registros-por-personagem.md) | Registros por personagem em vez de `if` central | Aceita |

Para criar um novo, copie o formato de um existente e use o próximo número.
