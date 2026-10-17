# playback: transformar eventos em animação

O engine devolve o estado novo **de uma vez** (o jogador já está na casa 42).
Mas a tela precisa *contar a história* em ordem: o dado gira, o boneco anda casa por casa, a armadilha dispara.

Cada `GameEvent` vira uma lista de **passos**:

```ts
interface PlaybackStep {
  apply: (view: MatchView) => MatchView; // como a tela muda neste passo
  durationMs: number;                    // quanto tempo segura antes do próximo
}
```

O `matchStore` executa os passos um atrás do outro e, no fim, encaixa a tela no estado real (`syncStep`).

## Arquivos

- `index.ts`: o roteador. Junta os handlers de todos os arquivos num mapa `evento → função`.
- `types.ts`: `PlaybackStep` e o tipo `StepHandlers`, que obriga a existir um handler por evento.
- `helpers.ts`: pequenas funções reaproveitadas, como "efeito em cima da casa do jogador".
- Por tema: `turn.ts` (dado, andar, turnos), `tiles.ts` (casas e armadilhas), `cards.ts`, `abilities.ts`.
- Por personagem (os mesmos nomes de `game/domain/`): `fairy.ts`, `seraph.ts`, `berserker.ts`, `kunoichi.ts`, `specters.ts`, `seals.ts`, `arrowRain.ts`, `cardGamble.ts`.

## Exemplo de leitura

Em `fairy.ts`, procure `winterSpread`. Ele recebe o evento (quais casas congelaram) e devolve os passos que mostram o gelo avançando.

## Adicionando um evento

1. Crie o evento em `game/domain/events.ts`.
2. O TypeScript vai acusar erro no `index.ts` ("falta a chave X").
3. Adicione o handler no arquivo do tema certo.
