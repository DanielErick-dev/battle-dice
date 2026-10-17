# ui/abilities: o que acontece ao clicar "Usar"

Algumas habilidades perguntam algo antes de serem usadas: em quem mirar, qual poder, quais cartas ou quais casas.
Cada uma dessas tem um arquivo aqui que exporta um `AbilityFlow` (veja `types.ts`):

```ts
interface AbilityFlow {
  start: (scene) => "picker" | "seals" | "specters" | "flames" | null;
  Picker?: componente do seletor;
}
```

- **`start`**: decide o que o botão "Usar" faz.
  - `"picker"`: abre o seletor.
  - `"seals"`, `"specters"` ou `"flames"`: começa a escolher casas no tabuleiro.
  - `null`: usa direto (por exemplo, a Chuva de Flechas sem ninguém no alcance).
- **`Picker`**: o componente. Ele recebe um `ctx` com:
  - `ctx.use(escolha)`: fecha o seletor e usa a habilidade com a escolha (`{ targetId }`, `{ power }`, `{ cardUids }`…);
  - `ctx.place("flames")`: fecha o seletor e começa a escolher casas;
  - `ctx.cancel()`: fecha sem usar.

As habilidades sem pergunta nenhuma (a maioria) não aparecem aqui e são usadas direto.

## Arquivos

| Arquivo | Habilidade |
|---|---|
| `hellsDrag.tsx` | Arrastar ao Inferno (Anjo Caído) |
| `timeWarp.tsx` | Engrenagem do Tempo (Cronos): poder primeiro, alvo depois |
| `cardGamble.tsx` | Aposta do Coringa |
| `arrowRain.tsx` | Chuva de Flechas |
| `ocularAwakening.tsx` | Despertar Ocular (Kage Rubra) |
| `cardChoices.tsx` | Transmutação e Ressurreição (escolher cartas) |
| `placements.ts` | Selos, Aparições e Chamas: escolher casas no tabuleiro |
| `index.ts` | o registro `ABILITY_FLOWS` |

## Ligação com o backend

O seletor só **monta a escolha**. A escolha vira o comando `activateAbility`, exatamente o JSON que vai pelo WebSocket.
A lista de alvos válidos vem do domínio (`dragTargets`, `gambleTargets`…). O servidor roda a mesma regra para validar, então a tela nunca decide nada sozinha.

## Adicionando uma habilidade que pergunta algo

1. Crie `minhaHabilidade.tsx` exportando um `AbilityFlow`. O `hellsDrag.tsx` é o modelo mais simples.
2. Adicione uma linha no `ABILITY_FLOWS` do `index.ts`.
