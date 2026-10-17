# Plano de refatoração

Começou em 17/10/2026. Cada etapa é pequena, mantém os testes verdes e vira um commit próprio.
Marque com ✅ ao terminar e anote o porquê de cada decisão.

## Diagnóstico

A base é boa: as regras são puras e testadas (281 testes), e o `GameClient` já está pronto para o multiplayer.
O problema é de **crescimento**. Com 20 personagens, alguns arquivos viraram "centrais telefônicas" onde todo personagem novo precisa mexer:

| Arquivo | Linhas | Sintoma |
|---|---|---|
| ~~`features/match/model/playback.ts`~~ | 1275 | ~~um único `switch` com 63 casos~~ ✅ etapa 1 |
| `features/match/scene/PlayerToken.tsx` | 718 | todos os efeitos de todos os personagens num componente |
| `features/match/ui/MatchScreen.tsx` | 657 | `if (ability === "cardGamble")…` repetido para cada seletor de alvo |
| `features/match/scene/BoardScene.tsx` | 615 | 42 imports; monta tudo de todos os personagens |
| `features/match/model/matchView.ts` | 409 | `MatchView` com 38 campos, muitos de um único personagem (`trample`, `tide`, `drag`…) |
| `features/match/characters.ts` | 460 | ficha visual de 20 personagens num arquivo só |
| `game/domain/engine.ts` | 600 | roteador de comandos crescendo |

**Princípio que vamos aplicar:** *aberto para extensão, fechado para modificação*. Adicionar o personagem 21 deveria significar **criar arquivos novos**, não editar 7 arquivos centrais.

## Etapas

### 0. Documentação base ✅
`docs/arquitetura.md`, este plano, `docs/ideias.md`, `CLAUDE.md`.

### 1. Quebrar o `playback.ts` por tema ✅
- `model/playback/` com `index.ts` (o roteador), `types.ts`, `helpers.ts` e um arquivo por tema: `turn`, `tiles`, `cards`, `abilities` e um por personagem com eventos próprios (`berserker`, `kunoichi`, `fairy`, `seraph`, `specters`, `seals`, `arrowRain`, `cardGamble`), com os mesmos nomes dos arquivos do domínio.
- O roteador virou um **mapa tipado** `StepHandlers<GameEvent["type"]>`: cada evento aponta para a função que o anima. O TypeScript exige uma entrada para cada evento (o `switch` antigo também exigia, pelo tipo de retorno; o ganho aqui é de organização, não de segurança).
- **Por quê:** para entender ou mexer na animação de um personagem, abre-se um arquivo de ~100 linhas em vez de rolar 1275. Personagem novo = arquivo novo + uma linha no `index.ts`.
- Feito com um script que cortou o `switch` automaticamente (sem copiar e colar à mão); os 281 testes passaram sem alteração.

### 2. Seletores de alvo das habilidades fora da `MatchScreen`
- Cada habilidade mirada declara o seu seletor num registro (`ui/abilityPickers/`), e a `MatchScreen` só renderiza "o seletor da habilidade atual".
- Some o bloco de `ability === "…"` repetido.

### 3. Agrupar os campos de efeito da `MatchView`
- `trample`, `tide`, `drag`, `frostStream`, `volley`, `dash`… vão para um sub-objeto de efeitos em andamento.
- A view principal fica só com o que é de todos (jogadores, dado, turno).

### 4. Efeitos por personagem fora do `PlayerToken` e da `BoardScene`
- Cada personagem registra os seus componentes de efeito (aura, cast, cadeira, asas) na ficha dele.
- `PlayerToken` e `BoardScene` passam a iterar sobre o registro em vez de conhecer cada um.

### 5. Uma ficha por personagem
- `features/match/characters/<id>.ts` reunindo modelo, clipes, cores, efeitos e intro; `characters/index.ts` monta o elenco.

### 6. Revisar o `engine.ts`
- Mesmo padrão da etapa 1: um handler por comando.

### Depois da refatoração
- Deploy na Vercel.
- Contrato do multiplayer: documentar `GameCommand`/`GameEvent` como o protocolo do WebSocket (base para o backend FastAPI).

## Diário

| Data | Etapa | O que mudou e por quê |
|---|---|---|
| 17/10 | 0 | Commits divididos (assets, kits, lab). Docs criadas. |
| 17/10 | 1 | `playback.ts` (1275 linhas, 63 casos) → `model/playback/` com 12 arquivos temáticos. |
