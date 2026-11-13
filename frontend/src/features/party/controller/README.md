# party/controller: o celular como controle no modo festa

Rota `/controle?sala=<código>`. A TV (`/mesa`, em `../tv/`) mostra o tabuleiro; aqui cada jogador vê só o lado dele: personagem, mão, dado, habilidade e as perguntas. Sem canvas 3D e sem carregar cena: é HTML feito para retrato, 360–430 px de largura, botões de pelo menos 48 px.

O transporte é o de `game/application/party/` (veja o README da application). Hoje os "celulares" são abas do mesmo navegador (BroadcastChannel); com o servidor FastAPI só muda o `Transport`.

## Pastas

| Arquivo                   | O que faz                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `model/connection.ts`     | `ControllerConnection`: o `MatchStore` do assento mais o estado da ligação (`connecting`, `live`, `reconnecting`, `failed`, `closed`). Testado com `MemoryRoom`. |
| `model/identity.ts`       | `clientId` no `sessionStorage` (cada aba é um celular; recarregar mantém o id e o assento), o assento salvo e o último nome digitado.                            |
| `model/seats.ts`          | Lista de assentos a partir do `presence`, código da sala digitado (`roomCodeFrom`, usa `shared/party/roomCode.ts`) e as mensagens de recusa.                     |
| `model/tileOptions.ts`    | Cada casa que dá para escolher, com o que há nela (efeito, selos, aparições, fogo, gelo, neve, quem está lá) e a distância até você.                             |
| `model/statusChips.ts`    | Os estados do jogador em palavras (escudo, perde a vez, pegando fogo…).                                                                                          |
| `model/lastEvent.ts`      | A última linha do log de batalha (sem os divisores de turno).                                                                                                    |
| `ui/ControllerScreen.tsx` | Entrada → assento → partida. Com assento salvo para a sala da URL, vai direto para a partida.                                                                    |
| `ui/JoinPanel.tsx`        | Código e nome; depois os assentos (entra como espectador pelo `useRoomPeek` só para ler o `presence`).                                                           |
| `ui/PhoneController.tsx`  | Cria a `ControllerConnection` e mostra cada estado dela: "Entrando", "Reconectando…", e volta para a entrada com o motivo.                                       |
| `ui/PhoneMatch.tsx`       | A partida no celular: cabeçalho, estado, última jogada, dado, mão, mesa (o `PlayersPanel`) e os seletores.                                                       |
| `ui/PhoneHand.tsx`        | A mão em grade de 3; tocar abre a carta numa folha com o que ela pede (valor do dado, alvo, cartas para queimar). Fundir e sacrificar ficam em cima.             |
| `ui/PhoneTilePicker.tsx`  | O lugar do "clique numa casa brilhando": a lista de casas, passo a passo, e a confirmação.                                                                       |

## O que é reaproveitado da partida

- `MatchStore` e `viewerControls`: o assento vem preso do snapshot, então "posso rolar / jogar / responder" já sai certo.
- `useAbilityUse` (`match/ui/screen/`): o mesmo fluxo de "Usar" de cada habilidade (`match/ui/abilities/`). Os seletores que já eram listas (alvos, poderes, cartas) aparecem iguais, presos à tela inteira; as escolhas de casa (selos, aparições, chamas negras, gelo da fada, o Vazio tomando ou soltando) usam o `picking` do hook, mas com a lista do `PhoneTilePicker` no lugar do tabuleiro.
- `PendingPrompts`: descarte, pilhagem, dádiva/relíquia e o Vazio engolindo a armadilha, iguais à partida. As cartas encolhem para caber três por linha.
- `cardBlockReason` (`match/ui/cards/`): o motivo de uma carta não poder ser jogada, o mesmo da `CardHand`.
- `CardView`, `EnergyMeter`, `AbilityMeter`, `VoidHold`, `BlessingBadges`, `PlayersPanel`, `ErrorToast`, `DiceFace`.

## Ligação e queda

- **Entrar**: o celular entra como espectador, lê os assentos, sai e entra de novo como jogador com o `seat` escolhido. A recusa (`ROOM_FULL`, `SEAT_TAKEN`, `UNKNOWN_SEAT`) ou o silêncio viram mensagem na entrada.
- **Queda**: um comando sem resposta (prazo do `RemoteGameClient`) vira "Reconectando…": o store fecha e reabre a cada 3 s pedindo o mesmo assento, e o snapshot novo encaixa a tela. Se outro celular pegou o assento nesse meio tempo, volta para a entrada. Ao voltar a olhar a aba (`visibilitychange`) pede `resync()`.
- **Fim**: `closed` (`HOST_CLOSED`, `SEAT_RELEASED`) volta para a entrada com o motivo.
- **Sair da página** (`pagehide`): manda o `leave`, para a TV mostrar "<nome> desconectou" (o BroadcastChannel não percebe aba fechada). Recarregar entra de novo no assento salvo.
- **Queda do link**: o `Transport` avisa por `onClose` e o `RemoteGameClient` repassa por `onLost`; a `ControllerConnection` trata como `lost` e reconecta na hora. Com o `BroadcastChannel` isso nunca dispara; com WebSocket é o `close` do socket.

## Testar

Abra `/jogar`, ligue **Modo festa** e abra a sala; na TV, "Abrir um controle em nova aba" (uma aba por jogador). No Chrome, use o DevTools em modo celular (Ctrl+Shift+M) nas abas de controle.
