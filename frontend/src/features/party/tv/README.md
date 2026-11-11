# party/tv: a tela da TV no modo festa

A TV (rota `/mesa`) é a **anfitriã** da partida: roda o `MatchHost` nesta aba e mostra o tabuleiro como **espectadora**. Cada jogador joga pelo celular (rota `/controle`, em outra pasta). O transporte está em `game/application/party/` (veja o README da application).

| Arquivo              | O que faz                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `partyRoom.ts`       | `PartyRoom`: abre e fecha o `MatchHost` (pelo `useEffect`, para o modo estrito do React nunca deixar dois anfitriões no canal) e guarda a lista de assentos, com o último nome de cada celular. Sem React; testado em `partyRoom.test.ts`. |
| `TvScreen.tsx`       | A tela inteira: cria o jogo (a TV sorteia a semente), abre a sala, mostra o lobby e depois a partida. Liga a classe `party-tv` no `<html>`.                                                                                                |
| `TvLobby.tsx`        | Código da sala grande, QR code para `/controle?sala=<código>`, os assentos (quem já entrou) e o botão "Começar", que só libera com todos os assentos ocupados.                                                                             |
| `TvMatch.tsx`        | A partida: um `MatchStore` espectador (`{ spectator: true }`) sobre `joinPartyOnChannel`, desenhado pelo `MatchTable` da partida normal, mais a faixa "Vez de <nome>" e os avisos de queda.                                                |
| `ClientTvScreen.tsx` | Carrega a tela só no navegador (BroadcastChannel, semente sorteada, 3D).                                                                                                                                                                   |

## O caminho

1. Em `/jogar`, liga **Modo festa**, escolhe tabuleiro, mapa, jogadores e personagens como sempre e clica em **Abrir a sala**.
2. `/mesa?tabuleiro=…&jogadores=…` sem `sala` sorteia um código (`features/shared/party/roomCode.ts`: 4 letras sem as que se confundem, como I/L/O/Q/U/V) e reescreve a URL. Recarregar mantém a mesma sala.
3. Lobby: os celulares entram; cada assento fica verde com o nome de quem entrou.
4. **Começar**: a TV entra como espectadora e mostra a partida. Em `npm run dev` há um botão "Dev: começar com assentos vazios" para olhar o tabuleiro sem celulares.

## Espectadora, não hot-seat

O snapshot de espectador vem com `localPlayerId` `null`, igual ao hot-seat. Por isso o `MatchStore` recebe `{ spectator: true }`: `viewerControls(view, seat, true)` não fala por ninguém (`viewerId` `null`, nenhum botão, nenhuma pergunta, sem ampulheta nem pausa) e o `dispatch` não envia nada. O tabuleiro, os bonecos, a câmera, os banners, o histórico e o painel de jogadores continuam, com o que a projeção de espectador mostra (nenhum segredo). O hot-seat no PC (`/partida`) não muda.

- **Reinício**: só pela TV. O "Jogar novamente" do `MatchTable` chama `host.restart()` direto.
- **Queda**: quando um celular sai (`leave`), o assento fica livre e a TV mostra "<nome> desconectou"; ao voltar com o mesmo `clientId`, o aviso some. O BroadcastChannel não percebe uma aba fechada sozinho: o celular precisa mandar o `leave` (o `close()` do `RemoteGameClient`) ao sair da página.
- **Tela grande**: `html.party-tv` aumenta o `font-size` da raiz (`--tv-scale`, em `globals.css`), então tudo que é medido em `rem` cresce. Só vale enquanto a `/mesa` está aberta.

## Por enquanto, um navegador só

Até o servidor FastAPI existir, os "celulares" são abas do mesmo navegador (o lobby avisa e tem o botão "Abrir um controle em nova aba"). Quando houver o `WebSocketTransport`, a TV deixa de ser anfitriã: vira só mais uma espectadora, e o `PartyRoom` passa a ler a presença do `RemoteGameClient` (`subscribePresence`) em vez do `MatchHost`.
