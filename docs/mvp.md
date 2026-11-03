# Checklist do MVP

Pedidos do Daniel que entram **antes** de fechar o MVP. Marque `[x]` quando estiver pronto e testado.
O que fica para depois do MVP está em [ideias.md](ideias.md), seção "Pós-MVP".

## Lote de 2026-10-26

### Correções
- [x] **Jogada extra + perde a vez.** Com uma jogada extra (ex.: carta do vento caindo numa casa de "jogue de novo"), se o jogador cai num "perde a vez" ou na neve da fada, hoje ele continua jogando (sentado na cadeira ou congelado). Correto: ele fica preso, e a jogada extra que sobrava já **consome uma** das rodadas perdidas.
- [x] **Neve da fada passa energia?** Conferir se quem fica preso na casa encantada realmente transfere a energia para a fada.
  - *Resultado:* a regra funcionava (1 de energia por vez perdida), mas era silenciosa. Agora aparece o aviso "PRESO NA NEVE" com quanto foi sugado. A jogada extra do item acima também escapava do dreno.
- [x] **Inverno Eterno mais fraco:**
  - no modo inverno a habilidade congela **só 1 casa** por vez;
  - pode ser **qualquer casa**, até uma com o fogo negro da Kage Rubra (o inverno é superior);
  - as casas congeladas pelo inverno (as escolhidas e as que congelam sozinhas do início rumo à chegada) funcionam **exatamente** como a neve normal da fada, inclusive o **pulo de +5** quando a própria fada para nelas.

### Novidades do MVP
- [ ] **5 cartas exclusivas por personagem** (eram 4; o Daniel mudou para 5 em 01/11/2026, a 5ª pode ser um Triunfo). O baralho continua com as cartas comuns e aleatórias, e cada personagem soma as suas próprias.
  - *Em andamento (2026-11-02):* **Têmis** pronta (5 cartas, todas com arte). **Zarek** tem 4, falta a 5ª. Os outros estão como proposta antiga de 4 cartas em [cartas-exclusivas.md](cartas-exclusivas.md), para repensar junto com o Daniel.
- [x] **Log de batalha** para o jogador não se perder no caos visual. Exemplos:
  - "J1 (Bruxa) usou Levitação"
  - "J3 (Bjorn) atropelou J2 e o mandou 6 casas para trás"
  - "J4 ativou uma Armadilha Escondida"
  - *Feito em 2026-10-29:* painel recolhível abaixo dos jogadores. Cada linha entra quando a animação do evento começa (não adianta o que vai acontecer). Aguardando o teste do Daniel.

### Equilibrar os personagens (um por vez)
Objetivo: cada personagem com uma habilidade **ativa** e uma **passiva**, todos únicos.

#### 1. Zarek, o Cavaleiro do Vazio (antes "Cavaleiro do Vazio", *Guardião das sombras*)
- [x] Renomear para **Zarek, o Cavaleiro do Vazio**.
- [x] **Passiva, o Vazio:** sempre que **qualquer jogador** cai numa armadilha, ou desarma/destrói uma armadilha, o Vazio do Zarek enche.
- [x] **Ativa, manipular o Vazio:**
  - quando o Zarek cai numa casa de armadilha, o Vazio **suga a armadilha** para dentro dele e a guarda (a armadilha é anulada);
  - nas próximas jogadas, ou na mesma, ele pode **colocar essa armadilha em qualquer lugar do mapa**. Ela é **adicionada** entre uma casa e outra, sem substituir nenhuma casa;
  - ao colocar, pode **dobrar a penalidade** da armadilha pagando **2 de energia**;
  - **recarga:** a cada 3 rodadas;
  - ~~se ficar 4 rodadas sem ativar, pega uma casa alterada e guarda~~ → **2026-10-30:** ele **rouba** a casa no lugar, sem ela perder a função (marcada pelo Vazio, efeito a favor dele), sem limite.
- [x] **Visual:** a entidade Vazio aparece de vez em quando vagando pelo mapa como uma sombra. Durante as habilidades é ela quem manipula tudo, como uma fenda no mapa.
- Pontos em aberto: ver a seção abaixo.

#### Respostas do Daniel (2026-10-26)
1. **O Vazio é a própria habilidade** do Zarek (a barra de carga). A passiva enche essa barra.
2. **Sugar a armadilha só com a habilidade pronta.** Sem ela, ele sofre a armadilha normalmente.
3. **Guarda só o que ele mesmo sugou** ao cair (e a casa alterada da regra das 4 rodadas). Sugestão do Claude: **1 espaço no Vazio**, que precisa ser usado antes de sugar outra coisa.
4. **"Entre uma casa e outra" = uma casa nova no tabuleiro.** O caminho fica 1 casa maior. É o primeiro passo para o tabuleiro mudar durante a partida.
5. **Dobrar a penalidade** (2 de energia): recuava 10, recua 20; a maldição drena o dobro; perde a vez vira 2 rodadas.
6. **A casa alterada passa a ser do Zarek**, não mais do dono original.
7. **A armadilha dele não o atinge.** Se ele cair nela com a habilidade pronta, pode recolocá-la pelo Vazio.

#### Decidido depois (2026-10-26)
- O Vazio guarda até **4** coisas.
- Cada armadilha (alguém cai, é destruída ou presa) enche o Vazio em **+1 de carga**.
- O jogo **sempre pergunta** antes de engolir (dá para recusar).
- O **perde a vez** (e as maldições) contam como armadilha para o Zarek: vão para o Vazio.
- Construído em 2026-10-26; aguardando o teste visual do Daniel.

### Correção extra (2026-10-26)
- [x] **Preso antes de rolar:** se uma carta ou habilidade leva o jogador para um perde a vez, neve ou gelo antes da rolagem, a vez acaba na hora.
- [x] A Kage **não** acende fogo no gelo do Inverno Eterno; na neve comum da fada ela continua acendendo (e derretendo a neve).

## Situação em 2026-11-02

### Feito nesta rodada
- Têmis refeita: Marca da Justiça (passiva), Veredito que devolve em dobro e paga +2 de energia e +1 de carga, 5 cartas com arte, habitat Tribunal, balança de bronze. Detalhes em [regras.md](regras.md).
- Até **8 jogadores** e **ampulheta** de 60 s por vez com 3 pausas por jogador (pode desligar na nova partida).
- Correções de teste: escudo segura a neve, Portal Místico pula portal com neve, neve do Zarek roxa, câmera do Vazio volta ao personagem, empurrões da Chuva de Flechas ao mesmo tempo, boneco sentado não "corre sentado", botão do dado sempre visível.

### Pendente
- [ ] **Validar na tela:** HUD com 8 jogadores, ampulheta e pausa, posição do botão do dado, flechas sincronizadas, tamanho e brilho da balança do Veredito.
- [x] **Akane** (02/11/2026): kit de fogo escarlate implementado (Zona de Incêndio, Ímpeto Brilhante, 5 cartas, chama na mão, habitat em brasa). Falta: teste visual, arte pintada das 5 cartas, assets do Meshy (lanterna, piso, torii, emblema de chama) e intro/cast.
- [ ] **5ª carta do Zarek.**
- [ ] **Coringa:** ganhou o teste de 4 jogadores; observar se a Aposta está forte demais.
