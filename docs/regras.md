# Regras do Battle Dice

O livro de regras completo: como a partida funciona, o que cada casa, carta e proteção faz, e a ficha de cada um dos 20 personagens.

Tudo aqui foi conferido no código das regras (`frontend/src/game/domain/`, outubro de 2026). Se o código mudar, este arquivo precisa mudar junto. Quando um texto da tela e o código discordarem, **vale o código**, e a divergência deve ser corrigida.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [O tabuleiro](#2-o-tabuleiro)
3. [Cartas](#3-cartas)
4. [Proteções e a regra do BLOQUEADO](#4-proteções-e-a-regra-do-bloqueado)
5. [Personagens](#5-personagens)
6. [Glossário](#6-glossário)

---

## 1. Visão geral

### Objetivo

Todos começam na casa **1** (INÍCIO). Vence quem chegar primeiro à última casa (CHEGADA). Não é preciso tirar o número exato: quem passaria da chegada para nela. A partida acaba na hora, seja qual for o movimento que te levou até lá (dado, carta, avanço, a neve da Fada).

Uma partida local tem de **1 a 4 jogadores**, e o mesmo personagem pode ser escolhido mais de uma vez. Jogando sozinho, várias habilidades mudam de comportamento (cada ficha diz como).

### Vez, turno e rodada

- **Sua vez** é o momento em que você joga.
- **Rodada** (que o jogo também chama de **turno**) é uma volta completa da mesa: todo mundo joga uma vez.

As durações e cargas são contadas nas **suas** vezes: um efeito "por 3 rodadas" desconta 1 a cada vez sua que termina, e a carga da habilidade sobe 1 a cada vez sua que começa. Como cada um joga uma vez por rodada, dá no mesmo, com duas exceções:

- **Vez extra** (casa de vez extra, Apoteose, Engrenagem do Tempo sem alvo) conta como mais uma vez sua: carrega, dá energia e desconta durações.
- **Vez extra + vez perdida:** se você ainda tinha uma vez extra e, nesta jogada, ficou preso (perde a vez, neve, gelo), a vez extra **é gasta como a primeira vez perdida** e a vez passa para o próximo.
- **Preso antes de rolar:** se uma carta ou habilidade te leva para um perde a vez, neve ou gelo antes da rolagem, a sua vez **acaba na hora**, sem rolar o dado.
- **Vez perdida** (perde a vez, neve, correntes, Engrenagem do Tempo) não conta para nada: não carrega a habilidade, não dá energia e não desconta levitação, armadura, bênçãos nem o seu fogo negro. Tudo fica congelado até você voltar a jogar.

> Exemplo: "fica pronta em 3 turnos" quer dizer "na sua 3ª vez de jogar". "Armadura por 3 rodadas, contando esta" quer dizer a vez em que você a ergueu e as duas seguintes.

### O que você faz na sua vez

Antes de rolar o dado, em qualquer ordem e quantas vezes as regras deixarem:

1. **Jogar cartas**: **1 carta por vez** (2 com a Conjuração Dupla).
2. **Usar a habilidade**, se estiver carregada. Usar a habilidade não encerra a vez.
3. **Fundir cartas** (3 cópias iguais viram 1 carta fundida, ver [Fusão](#fusão)). Fundir é grátis e não conta como a carta da vez.

Por fim você **rola o dado**: anda, resolve a casa onde parou e a vez passa. **Rolar é o que encerra a vez.** Jogar uma carta ou usar a habilidade nunca encerra.

Algumas escolhas pausam o jogo até serem respondidas: descartar com a mão cheia, decidir se o Vazio do Zarek engole a armadilha, a escolha de Seraphiel no céu, a escolha das cartas da Pilhagem.

### O dado

- Um dado comum de **6** faces.
- Cartas de **lançamento** mudam o jeito de rolar (2 dados somados, 2 dados ficando com o maior, valor escolhido). Só uma pode esperar a rolagem de cada vez.
- Cartas de **bônus** somam casas e se acumulam entre si e com uma carta de lançamento (combo).
- Ordem do cálculo: dado (ou dados) → **+** bônus de cartas, Vento a Favor, Asas Celestiais e coroa de Seraphiel → **×** Fúria Adormecida, se estiver em uso.
- Todo efeito de carta no dado vale para a **próxima rolagem** e fica esperando até ela acontecer, mesmo que você perca vezes no caminho.

### Energia

| Regra | Valor |
|---|---|
| Energia inicial | **1** |
| Máximo | **10** |
| Ganho natural | **+1 a cada 2 vezes suas** (vezes extras contam; vezes perdidas, não) |

Energia paga as cartas. Também vem de casas de energia (+2), da Fonte de Luz (+1 por vez), da Erva Curativa e de alguns personagens. Ela se perde em armadilhas de dreno (−2), na maldição de dreno, no fogo negro, nos selos e nas aparições.

### Carga da habilidade

- Cada personagem tem **uma** habilidade. A carga sobe **+1 no começo de cada vez sua**. Quando chega ao ciclo da habilidade, ela fica **pronta** e espera, sem acumular além disso, até você usá-la.
- Usar esvazia a carga, que recomeça do zero.
- A sua primeira vez já conta: uma habilidade de ciclo 3 fica pronta na sua **3ª vez** de jogar.
- Atalhos: a **casa de habilidade** dá +1 de carga; a **Inspiração Divina** carrega em dobro; a carta **Ascensão** deixa a habilidade pronta na hora (e, se a carga encher de novo na mesma vez, dá para usar outra vez).
- Duas habilidades seguram a carga depois de usadas (Indomável e Engrenagem do Tempo; ver as fichas). Mesmo assim, a casa de habilidade sempre carrega.

| Ciclo | Habilidades |
|---|---|
| **3** | O Vazio (mais +1 por armadilha disparada, destruída ou presa), Conjuração Dupla, Vento a Favor, Revisão Relâmpago, Bênção do Serafim, Transmutação, Aposta do Coringa |
| **4** | Veredito Silencioso (reativo, carga secreta) |
| **5** | Levitação Carmesim, Fúria Adormecida, Chuva de Flechas, Ressurreição, Escritura dos 4 Selos, Aparições Espectrais, Florescimento Feérico, Maré Purificadora, Indomável, Canhão de Plasma |
| **6** | Despertar Ocular |
| **7** | Arrastar ao Inferno, Engrenagem do Tempo |

> no código: `abilities/charge.ts` (ciclos), `abilities/basic.ts`, `core/turn.ts` (fim da vez), `handlers/turnCommands.ts` (rolagem), `core/energy.ts` (energia)

---

## 2. O tabuleiro

### Movimento

- **Andar** (dado, Passo do Vento, casa de avanço) é ir casa por casa para a frente. A casa onde você **para** tem efeito. Passar por cima normalmente não faz nada, mas aparições, o atropelo do Bjorn e as flechas da Arqueira olham o caminho inteiro.
- **Ser empurrado** é voltar casa por casa, mas a casa onde você cai **não tem efeito**.
- **Destinos não encadeiam.** O destino de um portal, de uma armadilha ou de um avanço nunca dispara outro efeito.
- Teleportes (Troca de Destinos, ser arrastado ao inferno) também não ativam a casa de chegada. O Portal Místico é a exceção: ele atravessa o portal de chegada.

### Tipos de casa

| Casa | O que faz |
|---|---|
| **Início / Chegada** | Sempre lisas. Chegar à última vence. |
| **Portal** | Leva você para a frente, até o destino dele. No Torneio, todo portal abre um **reino** (céu ou inferno, ver abaixo). |
| **Armadilha** | Manda você de volta para a casa de destino. Algumas são **amaldiçoadas**: também descartam 1 carta aleatória da mão ou drenam **2** de energia. |
| **Avanço** | Você anda até o destino, casa por casa. As aparições do caminho atacam, mas a casa de chegada não faz nada. |
| **Vez extra** | Você joga de novo. |
| **Perde a vez** | Você perde a próxima vez. |
| **Carta** | Você compra 1 carta do seu baralho. |
| **Energia** | **+2** de energia (até o máximo). |
| **Habilidade** | **+1** de carga. Funciona até quando a carga está segurada (Indomável, Engrenagem do Tempo). |
| **Armadilha escondida** | Parece uma casa lisa (ver abaixo). |
| **Maldição** (só no inferno) | Descarta 1 carta aleatória ou drena **2** de energia, sem mandar você de volta. |
| **Bênção** (só no céu) | Uma das quatro bênçãos do céu (ver abaixo). |
| **Relíquia** (só no céu) | Você recebe aquela carta divina (uma cópia nova a cada vez). |

#### Armadilhas escondidas

- Ficam em **zonas de armadilhas**, trechos do caminho principal com casas que parecem lisas. Ninguém sabe em qual casa elas estão.
- Quem **para** numa delas volta **5** casas e a armadilha se revela. Logo depois ela **muda de lugar** para outra casa livre da mesma zona, então decorar onde ela estava não adianta.
- Passar por cima não ativa.
- O Escudo Arcano bloqueia o efeito, mas a armadilha muda de lugar mesmo assim. Já o Susanoo da Kage Rubra **não** a impede: é um espinho que sobe do chão.

### Modos de jogo

#### Treino (20 casas)

Uma partida curta para aprender:

| Casa | Efeito |
|---|---|
| 3, 12 | Carta |
| 4, 16 | Energia (+2) |
| 5 | Portal do **inferno** (sai na 10) |
| 8 | Armadilha → 6, drena energia |
| 9 a 14 | Zona com **1** armadilha escondida |
| 15 | Portal do **céu** (sai na 19) |
| 18 | Armadilha → 17, descarta carta |

#### Torneio do Poder (200 casas)

Uma jornada longa, gerada por um sorteio de semente fixa: **o tabuleiro é igual para todo mundo, sempre**. Contagem real das casas:

| Tipo | Quantidade |
|---|---|
| Portais | **12**, que alternam inferno e céu (6 + 6). Nenhum antes da casa 25. |
| Armadilhas | **13** (6 descartam carta, 4 drenam energia, 3 só mandam de volta), cada uma recuando de 5 a 18 casas |
| Avanços | **12** (de 2 a 5 casas) |
| Cartas | **20** |
| Energia | **16** |
| Habilidade | **7** |
| Vez extra | **7** |
| Perde a vez | **6** |
| Zonas de armadilhas escondidas | **3** zonas de 10 casas (45–54, 95–104, 145–154), com **2** armadilhas cada |

Os portais saltam de 8 a 20 casas para a frente. Toda casa de destino (de portal, armadilha ou avanço) é lisa.

### Reinos: céu e inferno

Um portal de reino não te teleporta direto. Ele abre um **corredor de 18 casas** fora do caminho principal:

- Ao parar no portal, você vai para a **1ª casa do corredor**, que não tem efeito nessa chegada. Dali em diante você anda pelo corredor com o dado, normalmente.
- **Existe um só inferno e um só céu por tabuleiro.** Todos os portais do inferno dão no **mesmo** corredor, e dois jogadores que entraram por portais diferentes andam pelas mesmas casas.
- **Cada um sai pelo próprio portal.** Ao passar da última casa do corredor, você volta ao caminho principal no destino do portal **por onde entrou**. Empurrado para trás da 1ª casa, você volta para a casa desse portal.
- **O reino é isolado do tabuleiro.** Quem está num reino não pode mirar em quem está no caminho principal (nem o contrário), e só alcança quem está no mesmo reino. Num reino diferente, o oponente nem aparece como alvo.

#### O inferno: só tira

Todas as 18 casas fazem mal: maldições (descarte ou dreno de **2**), **perde a vez** e armadilhas que recuam de **2 a 4** casas dentro do corredor (algumas também amaldiçoadas). O padrão gira conforme o número do portal, então o inferno de cada tabuleiro é um pouco diferente. O Escudo Arcano bloqueia as armadilhas do inferno, mas não as maldições.

#### O céu: só dá

As 18 casas alternam as **quatro bênçãos** e as **três relíquias** (ver [Relíquias do céu](#relíquias-do-céu)). Toda casa vale a pena: nenhuma te leva para longe das outras.

**Bênçãos do céu** (duram **3 rodadas**; as de Seraphiel, **6**):

| Bênção | Efeito |
|---|---|
| **Asas Celestiais** | **+2** casas em cada rolagem |
| **Auréola Sagrada** | Armadilhas (escondidas também) e maldições não te atingem. "Perde a vez" ainda atinge. |
| **Inspiração Divina** | A habilidade carrega em dobro (+2 por vez) |
| **Fonte de Luz** | **+1** de energia no começo de cada vez sua |

- **Enquanto você está no céu, as bênçãos esperam**: não funcionam e não se gastam. Elas começam a valer, e a contar, quando você volta ao caminho.
- A vez em que você recebe a bênção não desconta.
- Bênçãos iguais **se acumulam**: cada cópia conta o próprio tempo. Asas e Fonte de Luz somam por cópia (duas Asas dão +4 por rolagem).

> no código: `board/` (`board.ts`, `generator.ts`, `realms.ts`, `blessings.ts`, `hiddenTraps.ts`, `traps.ts`, `landing.ts`)

### Ordem das coisas ao parar numa casa

Para quem quer o detalhe exato, nesta ordem:

1. **Enquanto anda**: o atropelo do Bjorn e as aparições do Guardião das Sombras agem casa por casa.
2. **Ao parar**:
   1. A casa tem a **Kage Rubra com Susanoo**? Você é jogado **1** casa para trás e nada mais acontece.
   2. Se *você* é a Kage com Susanoo, empurra quem está na casa **1** para a frente.
   3. **Levitando?** Nada da casa te afeta.
   4. Seraphiel pisando no inferno **cai** (vira o Anjo Caído).
   5. **Fogo negro** na casa: só o fogo age.
   6. **Neve da Fada** ou **gelo do Inverno Eterno** na casa: só a neve age (o gelo é a mesma neve).
   8. **Selo** na casa: o selo quebra e nada mais acontece.
   9. **Ameaça** (armadilha, escondida, maldição) ou **perde a vez**. Quem protege, nesta ordem: Anjo Caído no inferno, Indomável, Susanoo (não contra a escondida), Auréola (não contra perde a vez), o Vazio do Zarek (ele escolhe; também engole o perde a vez), Escudo Arcano (só armadilhas).
   10. Senão, o efeito normal da casa (portal, bênção, carta…).
3. **Depois**: as armadilhas presas por flechas que você atravessou voltam a funcionar.

---

## 3. Cartas

### Básico

| Regra | Valor |
|---|---|
| Mão inicial | **6** cartas |
| Limite da mão | **8** cartas |
| Cartas por vez | **1** (2 com Conjuração Dupla); fundir não conta |
| Baralho padrão | **26** cartas com oponentes, **20** sozinho (cartas que miram oponentes ficam de fora), mais as **4 exclusivas** do personagem (1 cópia de cada) |

**Custo por raridade** (algumas cartas têm custo próprio):

| Raridade | Nível | Custo | Cópias no baralho |
|---|---|---|---|
| Comum | 1 | 1 | 3 |
| Incomum | 2 | 2 | 2 |
| Rara | 3 | 2 | 2 |
| Épica | 4 | 3 | 1 |
| Lendária | 5 | 4 | 1 |

### Baralho, descarte e mão cheia

- Cartas jogadas ou descartadas vão para a **pilha de descarte**. Quando o baralho acaba, o descarte é embaralhado e vira o novo baralho. Se os dois estão vazios, você não compra nada.
- **Mão cheia (fila de descarte):** se uma carta chega com a mão cheia (8), o jogo pausa e você **escolhe uma** carta para descartar, entre as da mão e a que chegou. Se chegam várias de uma vez (Pergaminho, roubo), elas entram numa **fila** e cada uma pede o seu descarte, uma de cada vez. Nenhuma carta se perde sem você escolher.
- Exceção: cartas **criadas do nada** (Transmutação com mão pequena, jackpot da Aposta jogando sozinho) vão direto para o descarte se a mão estiver cheia, sem perguntar.
- Cartas **ressuscitadas** (Necromante) viram pó ao sair da mão: não voltam para o descarte.

### Quando uma carta não pode ser jogada

- Você está **silenciado** (Selo do Silêncio).
- Falta energia.
- **Escudo Arcano** quando o escudo já está erguido.
- Uma carta de **lançamento** quando outra ainda espera a rolagem.
- **Portal Místico** sem portal à frente no caminho principal.
- **Luz Celestial** com a energia cheia.
- **Ascensão** com a habilidade já pronta (ou sem habilidade).
- **Chamado do Abismo** num tabuleiro sem inferno.
- Uma **carta exclusiva** de outro personagem (roubada): só o dono a joga.
- **Fome do Vazio** com a habilidade já pronta; **Fenda Faminta** com o Vazio cheio ou sem armadilha à vista; **Eco do Vazio** com o Vazio vazio ou cheio.

### O catálogo

| Carta | Raridade | Custo | Efeito |
|---|---|---|---|
| **Passo do Vento** | Comum | 1 | Avance **3** casas. A casa onde parar tem efeito. Sob o tempo invertido do Cronos, você recua 3 casas. |
| **Erva Curativa** | Comum | 1 | **+6** de energia e cancela todas as vezes perdidas (inclusive neve e correntes). |
| **Amuleto da Sorte** | Comum | 1 | Bônus: **+2** na próxima rolagem. |
| **Escudo Arcano** | Incomum | 2 | A próxima armadilha (escondida ou do inferno também) não tem efeito. Não bloqueia maldições. |
| **Pergaminho Antigo** | Incomum | 2 | Compre **2** cartas. |
| **Olho do Oráculo** | Incomum | 2 | Lançamento: role 2 dados e fique com o maior. |
| **Rajada Arcana** | Incomum | 2 | Mira: empurre um oponente **7** casas para trás. |
| **Fúria Selvagem** | Rara | 2 | Lançamento: role 2 dados e some os dois. |
| **Clarão Ofuscante** | Rara | 2 | Mira: o oponente perde a próxima vez. |
| **Portal Místico** | Épica | 3 | Vá direto ao próximo portal do caminho principal e atravesse-o (dentro de um reino, conta a partir do portal por onde você entrou). Um portal coberto por fogo negro ou gelo do Inverno é pulado. |
| **Runa do Destino** | Épica | 3 | Lançamento: escolha o valor (1 a 6) da próxima rolagem. |
| **Despertar Ancestral** | Épica | 3 | Bônus: **+3** nas próximas **2** rolagens. |
| **Chamado do Abismo** | Épica | 3 | Mira: arraste ao inferno um oponente que esteja no caminho principal. Ele anda o inferno inteiro e sai na casa de onde foi tirado (é a carta do [Arrastar ao Inferno](#18b-anjo-caído-a-queda-de-seraphiel)). |
| **Troca de Destinos** | Lendária | **10** | Mira: troque de lugar com um oponente do mesmo lugar. As casas de chegada não têm efeito. |
| **Luz Celestial** | Relíquia | **0** | A energia enche até o máximo. |
| **Égide Celestial** | Relíquia | **2** | Por **3** rodadas (contando esta), nada que os oponentes mirarem em você funciona (inclui o tempo do Cronos). |
| **Ascensão** | Relíquia | **2** | A habilidade fica pronta na hora. |

Cartas de **mira** escolhem um oponente no mesmo lugar (caminho principal ou o mesmo reino). Mirar num oponente protegido gasta a carta: ver [BLOQUEADO](#a-regra-do-bloqueado).

### Cartas exclusivas

Cada personagem tem **4 cartas próprias**, embaralhadas só no baralho de quem o escolheu (1 cópia de cada). Só o dono as joga: roubadas, ficam mortas na mão de quem pegou. Não saem da Transmutação nem do jackpot da Aposta, e não se fundem. A lista completa (e as propostas dos outros personagens) está em [cartas-exclusivas.md](cartas-exclusivas.md).

| Carta | Dono | Raridade | Custo | Efeito |
|---|---|---|---|---|
| **Balança da Justiça** | Têmis | Épica | 3 | Mira: soma a energia dela com a do oponente e divide igual (a sobra fica com ela). |
| **Espada da Lei** | Têmis | Rara | 2 | Mira: empurra **4** casas, ou **8** se o oponente estiver à frente dela. |
| **Peso da Culpa** | Têmis | Incomum | 2 | Mira: o oponente descarta **2** cartas ao acaso. |
| **Venda Sagrada** | Têmis | Comum | 1 | Desarma as armadilhas escondidas nas próximas **12** casas (+1 de energia cada). |
| **Fome do Vazio** | Zarek | Incomum | 2 | O Vazio ganha **+2** de carga. |
| **Fenda Faminta** | Zarek | Rara | 2 | O Vazio engole a primeira armadilha, maldição ou "perde a vez" visível nas próximas **15** casas, sem gastar a carga. |
| **Eco do Vazio** | Zarek | Épica | 3 | A última coisa guardada no Vazio vira duas. |
| **Chamado da Fenda** | Zarek | Épica | 3 | Mira: puxa o oponente até a fenda do Zarek mais próxima atrás dele, e ela o atinge. Contra a Têmis armada, é só anulada. |

### Relíquias do céu

As três relíquias (Luz Celestial, Égide Celestial, Ascensão) **nunca vêm no baralho**: só se ganham parando na casa delas no céu. Cada parada dá uma cópia nova. Depois de jogadas, elas vão para o seu descarte como qualquer carta e voltam a ser compradas quando o descarte for embaralhado. Contam como **lendárias** (nível 5) para a Transmutação.

### Fusão

Com **3 cópias** comuns (não fundidas) da mesma carta na mão, você pode fundi-las numa única **carta fundida**, muito mais forte:

- Fundir é grátis, pode ser feito a qualquer momento da sua vez e não conta como a carta da vez.
- A carta fundida custa o mesmo que a original.
- Uma carta fundida não funde de novo.
- Depois de jogada, ela vai para o descarte **ainda fundida**: as 3 cópias viram 1 de vez no seu baralho.

| Carta | Fundida | Efeito fundido |
|---|---|---|
| Passo do Vento | **Vendaval** | Avance **9** casas |
| Erva Curativa | **Elixir da Vida** | Energia cheia e cancela as vezes perdidas, a neve e as correntes |
| Amuleto da Sorte | **Trevo Dourado** | **+10** na próxima rolagem |
| Escudo Arcano | **Égide Arcana** | Escudo Arcano **e** Armadura Espectral por **2** rodadas |
| Pergaminho Antigo | **Grimório Proibido** | Compre **5** cartas |
| Rajada Arcana | **Tempestade Arcana** | Empurre um oponente **15** casas para trás |
| Luz Celestial | **Aurora Divina** | Energia cheia, habilidade pronta, livre das vezes perdidas e da neve |
| Égide Celestial | **Santuário Celestial** | Égide por **6** rodadas **e** Escudo Arcano |
| Ascensão | **Apoteose** | Habilidade pronta e uma vez extra depois desta |

Só as cartas dessa tabela fundem. O baralho tem 3 cópias de Passo do Vento, Erva e Amuleto, mas só 2 de Escudo, Pergaminho e Rajada: a terceira tem que vir de outro jeito (Transmutação, roubo, Ressurreição).

> no código: `cards/catalog.ts` (catálogo), `cards/play.ts` (efeitos e números), `cards/fusion.ts`, `cards/decks.ts`, `cards/hand.ts` (compra e mão cheia)

---

## 4. Proteções e a regra do BLOQUEADO

### As proteções

| Proteção | De onde vem | Duração | O que bloqueia | O que **não** bloqueia |
|---|---|---|---|---|
| **Escudo Arcano** | Carta; Égide Arcana; Santuário Celestial | Até a próxima armadilha | Uma armadilha (comum, escondida ou do inferno), e aí se gasta | Maldições, perde a vez, nada mirado |
| **Armadura Espectral** | Égide Arcana (2); Égide Celestial (3/6) | Rodadas, contando a atual | Tudo o que os **outros** fazem contra você: cartas e habilidades miradas, selos, aparições, neve e gelo da Fada, fogo negro, atropelo, o empurrão do Susanoo quando a Kage para na sua casa, Chuva de Flechas, Canhão de Plasma | Armadilhas, maldições e perde a vez do tabuleiro |
| **Égide Celestial** | Relíquia | 3 rodadas (6 fundida) | O mesmo que a Armadura Espectral (ela vem junto) | O mesmo |
| **Susanoo** | Despertar Ocular da Kage Rubra | 3 rodadas | Tudo o que a Armadura bloqueia, **mais** armadilhas, maldições e perde a vez do tabuleiro. Ninguém para na casa dela. | A **armadilha escondida** e o **fogo negro** de outra pessoa (atacam por dentro) |
| **Indomável** | Habilidade do Bjorn | 3 rodadas | Tudo o que a Armadura bloqueia, **mais** armadilhas (escondidas também), maldições e perde a vez. Desfaz o tempo invertido. | Bênçãos continuam valendo (é bom) |
| **Auréola Sagrada** | Bênção do céu | 3 rodadas | Armadilhas (escondidas também) e maldições | Perde a vez, nada mirado |
| **Levitação** | Habilidade da Bruxa | 2 vezes | O efeito de **qualquer** casa onde ela para, inclusive as boas | Aparições, atropelo, empurrões, cartas miradas |
| **Anjo Caído no inferno** | Passiva | Sempre | Maldições, armadilhas e perde a vez **do inferno** | Fora do inferno, nada |
| **O Vazio** | Habilidade do Zarek | Reativa | Armadilha (escondida também), maldição ou perde a vez, à escolha dele: vai para o Vazio | Nada mirado; com o Vazio cheio, não é oferecido |

Detalhes:
- **Armadura Espectral, Égide, Susanoo e Indomável** são as quatro proteções "contra os outros". No jogo, quem está sob uma delas é chamado de **protegido**.
- A **Bruxa Carmesim** (passiva) também ignora a neve, o gelo e o fogo negro dos outros, mesmo sem levitar.
- Uma armadura que barra um selo ou uma aparição **não os destrói**: eles continuam lá, esperando outra pessoa.

### A regra do BLOQUEADO

1. Habilidades e cartas que **miram um oponente** (Rajada Arcana, Clarão Ofuscante, Troca de Destinos, Chamado do Abismo, Arrastar ao Inferno, Engrenagem do Tempo, Aposta do Coringa) **sempre** deixam escolher oponentes protegidos. O jogo não esconde ninguém: é preciso prestar atenção em quem está protegido.
2. Mirar num protegido **gasta** a carta (energia e tudo) ou a habilidade (carga zerada), não faz nada e mostra o aviso **BLOQUEADO!**.
3. Quem barra, nesta ordem: Indomável → Susanoo → Armadura Espectral → Égide Celestial.
4. **Oponentes em outro reino não podem ser alvo.** Eles nem aparecem na lista (do céu, o Cronos não alcança o tabuleiro).
5. Efeitos **em área**, que não escolhem alvo (Chuva de Flechas nos oponentes, o empurrão do Canhão de Plasma, o atropelo do Bjorn), simplesmente pulam os protegidos, sem BLOQUEADO.
6. Exceção da Aposta do Coringa: sem ninguém para roubar no mesmo lugar, ela lista **todos** os oponentes e oferece o **Lance da Sorte** (ver a ficha do Coringa).

> no código: `core/playerStatus.ts` (`aimWard`, `isUntouchable`, `inSusanoo`), `board/reach.ts` (`opponentsInSpace`, `sameSpace`), `cards/play.ts`

---

## 5. Personagens

Todas as fichas seguem o mesmo modelo: **habilidade**, **carga**, **o que faz**, **detalhes e exceções**, **passiva** (quando há) e onde fica no código. "Carga N" quer dizer que a habilidade fica pronta na sua N-ésima vez e, depois de usada, de novo N vezes suas depois.

| # | Personagem | Habilidade | Carga |
|---|---|---|---|
| 1 | Zarek, o Cavaleiro do Vazio | O Vazio | 3 |
| 2 | Encantadora Carmesim | Conjuração Dupla | 3 |
| 3 | Bruxa Carmesim | Levitação Carmesim | 5 |
| 4 | Alquimista Esmeralda | Transmutação | 3 |
| 5 | Monge Ancião | Fúria Adormecida | 5 |
| 6 | Arqueira Élfica | Chuva de Flechas | 5 |
| 7 | Coringa Carmesim | Aposta do Coringa | 3 |
| 8 | Necromante | Ressurreição | 5 |
| 9 | Escriba da Carne | Escritura dos 4 Selos | 5 |
| 10 | Guardião das Sombras | Aparições Espectrais | 5 |
| 11 | Kage Rubra | Despertar Ocular | 6 |
| 12 | Fada Cristalina | Florescimento Feérico | 5 |
| 13 | Zéfiro | Vento a Favor | 3 |
| 14 | Têmis | Veredito Silencioso | 4 |
| 15 | Akane | Revisão Relâmpago | 3 |
| 16 | Bjorn Presa-Gélida | Indomável | 5 |
| 17 | Auric | Maré Purificadora | 5 |
| 18 | Seraphiel (e o Anjo Caído) | Bênção do Serafim / Arrastar ao Inferno | 3 / 7 |
| 19 | Cronos | Engrenagem do Tempo | 7 |
| 20 | Unidade Alva | Canhão de Plasma | 5 |

---

### 1. Zarek
*O Cavaleiro do Vazio*

**Habilidade:** O Vazio · **Carga:** 3 · **Tipo:** reativa (o botão só aparece para "Tomar", ver abaixo)

**Passiva: o Vazio se alimenta**
- Cada armadilha em que **qualquer jogador** cai, ou que é **destruída** ou **presa** (Canhão de Plasma, Chuva de Flechas), dá **+1** de carga ao Vazio. O que o próprio Vazio engole não conta.

**Engolir**
1. Com o Vazio pronto e com espaço (guarda até **4** coisas), quando uma **armadilha** (comum, escondida ou do inferno), uma **maldição** ou um **perde a vez** vai te atingir, o jogo pausa e pergunta se o Vazio engole.
2. **Engoliu:** o mal não te atinge, a casa fica sem efeito para sempre (a escondida sai do tabuleiro) e ele vai para o Vazio. A carga zera.
3. **Recusou:** você sofre normalmente e o Vazio continua pronto.

**Soltar (na sua vez, quantas vezes quiser, sem gastar carga)**
- Uma **armadilha, maldição ou perde a vez** guardada abre uma **fenda**: uma **casa nova** no caminho, logo depois da casa que você escolher (o tabuleiro fica 1 casa maior). Pode ser em qualquer ponto do caminho principal antes da chegada.
- Ao abrir, você pode **dobrar a penalidade** pagando **2 de energia**: volta o dobro de casas, a maldição atinge duas vezes, o perde a vez vale 2 rodadas.
- As **suas fendas nunca te atingem**. Parando numa delas com o Vazio pronto, você pode engoli-la de novo.

**Roubar (botão da habilidade)**
- Com o Vazio pronto, o botão **rouba** uma casa de outro jogador: **fogo negro, neve, gelo escolhido pela Fada, selo ou aparição** (a carga zera).
- A casa **fica no lugar e mantém o efeito**, marcada com o selo do Vazio, mas agora é **sua**: a neve te leva 5 casas e prende os outros (dando energia a você), o fogo queima os outros, o selo e a aparição agem a seu favor. O gelo da Fada vira neve sua.
- **Sem limite** de casas roubadas.

**Detalhes e exceções**
- A pergunta vem **mesmo com o Escudo Arcano erguido**: engolindo, você guarda o escudo.
- Se outra proteção já barra o golpe (Auréola, Indomável…), a pergunta nem aparece.
- Com o Vazio cheio (4), ele não engole: solte algo antes.
- A sombra do Vazio aparece de vez em quando vagando pelo mapa, e é ela que abre as fendas.

> no código: `characters/zarek/void.ts` (`swallow`, `placeVoid`, `seize`, `feedTheVoid`), `board/board.ts` (`linkRift`), `board/landing.ts`

---

### 2. Encantadora Carmesim
*Feiticeira de sangue*

**Habilidade:** Conjuração Dupla · **Carga:** 3

**O que faz**
1. Nesta vez, você pode jogar **2 cartas** em vez de 1.

**Detalhes e exceções**
- Vale até o fim da vez em que foi usada, e cada carta ainda paga a sua energia.
- As outras regras continuam valendo: só uma carta de lançamento esperando o dado, sem escudo duplo e assim por diante.

> no código: `abilities/basic.ts` (`cardsPerTurn`)

---

### 3. Bruxa Carmesim
*Senhora dos feitiços de sangue*

**Habilidade:** Levitação Carmesim · **Carga:** 5

**O que faz**
1. Você flutua por **2 vezes suas** (esta e a próxima).
2. Nenhuma casa onde você para tem efeito: armadilhas, escondidas, maldições, perde a vez, selos, fogo, neve, mas também portais, bênçãos, cartas e energia.

**Detalhes e exceções**
- Uma armadilha escondida sob você nem se revela nem muda de lugar.
- O Escudo Arcano continua guardado.
- A levitação **não** impede o que acontece no caminho nem o que é mirado: aparições atacam, o Bjorn atropela, cartas e empurrões funcionam, e o Susanoo da Kage te joga para trás.

**Passiva: pés que não tocam o chão**
- Os feitiços de chão dos outros nunca te atingem, mesmo sem levitar: a **neve** e o **gelo do Inverno Eterno** da Fada, e o **fogo negro** da Kage Rubra.
- Parando numa casa dessas, nada acontece com você (nem o efeito original da casa).

> no código: `abilities/basic.ts` (`levitate`), `board/landing.ts`, `core/playerStatus.ts` (`groundSpellsSpare`)

---

### 4. Alquimista Esmeralda
*Mestra das transmutações*

**Habilidade:** Transmutação · **Carga:** 3

**O que faz**
1. Escolha **2 cartas** da mão.
2. Os **níveis** de raridade delas se somam (comum 1, incomum 2, rara 3, épica 4, lendária 5), até no máximo **5**.
3. Você ganha uma carta aleatória **desse nível**, no lugar da primeira carta escolhida. As duas escolhidas somem do jogo.

**Detalhes e exceções**
- A carta nova é permanente: depois de jogada, ela vai para o seu descarte e volta ao baralho.
- O nível 5 inclui a Troca de Destinos e as **relíquias do céu**.
- Sozinho, nunca sai carta que mira oponente. Se um nível só tiver cartas assim, o sorteio desce um nível.
- **Com menos de 2 cartas na mão**, não há o que sacrificar: você ganha uma carta aleatória de **nível 3** (rara). Se a mão estiver cheia, ela vai direto para o descarte.

> no código: `characters/alchemist/transmutation.ts`

---

### 5. Monge Ancião
*A calma antes da tempestade*

**Habilidade:** Fúria Adormecida · **Carga:** 5

**O que faz**
1. Use antes de rolar: a rolagem desta vez vale o **TRIPLO** (1 vira 3, 6 vira 18).
2. Você cruza o caminho como um raio.

**Detalhes e exceções**
- O triplo vem **depois** de todos os bônus: cartas de lançamento, Amuleto, Despertar Ancestral, Asas, coroa. Por exemplo, Fúria Selvagem (2 dados) + Amuleto (+2) com um 4 e um 5 dá (4 + 5 + 2) × 3 = **33** casas.
- Vale só para a vez em que foi usada.
- Aparições e flechas no caminho agem normalmente.

> no código: `abilities/basic.ts` (`rollMultiplier`), `handlers/turnCommands.ts`

---

### 6. Arqueira Élfica
*Flechas que caem do céu*

**Habilidade:** Chuva de Flechas · **Carga:** 5

**O que faz:** escolha onde as flechas caem.

- **Nos oponentes:** **todos** os oponentes ao alcance (mesmo lugar, não protegidos) voltam **10** casas. Só pode ser escolhido se houver pelo menos um.
- **Nas armadilhas:**
  1. As próximas **3** ameaças à frente (armadilhas, escondidas e maldições) ficam **presas**.
  2. As escondidas presas se revelam.
  3. Uma casa presa não faz nada com quem para nela.
  4. Quando **você** (ou qualquer um) **passa** por ela, a flecha se solta e a casa volta a funcionar. A escondida solta, como foi revelada, muda de lugar na zona.

**Detalhes e exceções**
- Os protegidos são pulados em silêncio (é efeito em área, sem BLOQUEADO).
- Sozinha, ou se você não escolher, as flechas vão nas armadilhas.
- A Maré Purificadora do Auric também tira as flechas.

> no código: `characters/archer/arrowRain.ts`

---

### 7. Coringa Carmesim
*Quem aposta, arrisca*

**Habilidade:** Aposta do Coringa · **Carga:** 3

**O que faz**
1. Escolha o oponente da aposta.
2. Role o **dado da sorte**:

| Dado | Resultado com oponente | Sozinho |
|---|---|---|
| **1–2** | Ele leva **1** carta aleatória sua | 1 carta aleatória sua é descartada |
| **3–5** | Você rouba **2** cartas aleatórias dele | Você compra **2** cartas |
| **6** (jackpot) | Você rouba **2** cartas, **épicas primeiro** (lendárias contam). Faltando épicas, completa com outras. | Você ganha **2** cartas épicas novas (que ficam no baralho) |

**Detalhes e exceções**
- Ninguém escolhe as cartas: elas saem ao acaso.
- Ganhar contra uma mão vazia não traz nada. O que não cabe na mão entra na fila de descarte.
- **Apostar contra um protegido** (ou alguém em outro lugar) é permitido. Ganhando, aparece **BLOQUEADO** e nada acontece. Perdendo, **1 carta sua vai para o descarte** (não para ele).
- **Sem ninguém para roubar no mesmo lugar** (todos protegidos ou em outro reino), a lista mostra **todos** os oponentes. Nesse caso também existe o **Lance da Sorte**: você não aposta e só rola o dado, comprando **tantas cartas quanto ele mostrar** (1 a 6).
- Sozinho, a Aposta segue a coluna "Sozinho" acima, e o jackpot nunca cria carta que mira oponente.

> no código: `characters/jester/cardGamble.ts`

---

### 8. Necromante
*O que foi jogado não morre*

**Habilidade:** Ressurreição · **Carga:** 5

**O que faz**
1. Escolha de **1 a 2** cartas da **sua pilha de descarte** (cartas que você jogou ou descartou).
2. Elas voltam para a sua mão, na ordem escolhida.
3. Voltam **ressuscitadas**: quando saírem da mão de novo (jogadas ou descartadas, até por maldição), **viram pó** e somem do jogo.

**Detalhes e exceções**
- Precisa ter algo no descarte e espaço na mão: não pode ser usada com a mão cheia, e só traz quantas couberem.
- Uma carta fundida volta fundida.

> no código: `characters/necromancer/resurrection.ts`, `cards/decks.ts` (`throwOnPile`)

---

### 9. Escriba da Carne
*O que ele escreve, você paga*

**Habilidade:** Escritura dos 4 Selos · **Carga:** 5

**O que faz**
1. Escreva **4 selos**, um de cada tipo, em 4 casas diferentes, até **20** casas à frente ou atrás de você (a sua casa vale).
2. Para os outros, **todos os selos parecem iguais**. Só você sabe qual é qual.
3. O oponente que **parar** num selo o quebra e sofre:

| Selo | Efeito no oponente |
|---|---|
| **Dízimo** | Te entrega a carta **mais cara** da mão dele |
| **Ruína** | Volta **10** casas |
| **Silêncio** | Não joga cartas no resto da vez e em toda a próxima |
| **Pacto de Sangue** | Perde **2** de energia, que vai para você (só o que couber na sua barra) |

**Detalhes e exceções**
- Só em casas lisas do caminho principal (casas de energia e de habilidade contam como lisas). Nunca no início, na chegada, num reino, sobre outro selo ou sobre uma aparição.
- Os selos **se acumulam** de um uso para o outro até alguém pisar.
- Quando o selo quebra, **só ele age**: o resto da casa (uma armadilha escondida, a energia) espera.
- Seus próprios selos não fazem nada com você enquanto houver oponentes: continuam lá.
- **Protegido** (Armadura, Indomável…) não quebra o selo: ele fica para o próximo.
- **Sozinho**, pisar nos seus selos te **recompensa**: Dízimo compra 1 carta, Ruína avança **3** casas, Silêncio dá **+1** de energia, Pacto dá **+2**.

> no código: `characters/scribe/seals.ts`

---

### 10. Guardião das Sombras
*Sem rosto, sem rastro*

**Habilidade:** Aparições Espectrais · **Carga:** 5

**O que faz**
1. Duas aparições suas surgem em casas que você escolhe, até **20** casas de distância: a da **Pilhagem** e a da **Fome**.
2. Quem **passar** por elas (não precisa parar) é atingido:
   - **Pilhagem:** o jogo pausa e **você escolhe 2 cartas** da mão dele (todas, se ele tiver menos) para levar.
   - **Fome:** ele perde **toda** a energia para você. O que não couber na sua barra adianta sua habilidade em **+1** de carga.
3. A aparição some depois de atingir alguém.

**Detalhes e exceções**
- As casas seguem a regra dos selos (lisas, no caminho principal, sem selo nem outra aparição). **No céu**, você pode assombrar qualquer casa do corredor celeste dentro do alcance. **No inferno**, não há onde invocar.
- As aparições **se acumulam** entre usos.
- **Quem passar pela sua casa dissipa todas as suas aparições**, inclusive as que ficam antes de você no caminho dele: se o movimento chega até você, nenhuma aparição ataca nesse movimento.
- Atingem quem passa andando de qualquer jeito (dado, Passo do Vento, casa de avanço, até andando para trás sob o tempo invertido) e mesmo quem levita. Empurrões e teleportes não contam.
- Pilhagem contra mão vazia não leva nada. Só uma Pilhagem espera de cada vez.
- Protegido passa ileso, e a aparição fica.
- Suas aparições não fazem nada com você enquanto houver oponentes.
- **Sozinho**, passar por elas te **recompensa**: Pilhagem compra **2** cartas, Fome enche a energia.

> no código: `characters/warden/specters.ts`

---

### 11. Kage Rubra
*O olhar que queima*

**Habilidade:** Despertar Ocular · **Carga:** 6 · **Escolha um dos dois poderes ao usar:**

**Chamas Eternas**
1. Escolha até **2** casas, em **qualquer lugar** do caminho principal (até a sua), que não sejam o início, a chegada ou já estejam em chamas.
2. Elas pegam **fogo negro** por **10 rodadas** (contadas nas suas vezes).
3. O oponente que **parar** numa delas perde **2** de energia, volta **10** casas e te dá **+1** de carga.
4. Cada fogo **apaga depois de queimar 2 vezes**.

**Susanoo**
1. Por **3 rodadas** (contando esta), você fica dentro de um Susanoo.
2. Nada que os outros mirarem funciona (BLOQUEADO), e selos, aparições, neve e atropelo não te pegam.
3. Armadilhas, maldições e perde a vez do tabuleiro também não.
4. **Ninguém para na sua casa**: quem tentar é jogado **1** casa para trás, onde nada acontece com ele.
5. Quando você para numa casa ocupada, empurra os outros **1** casa para a frente (nunca para a chegada; protegidos ficam).

**Detalhes e exceções**
- O fogo negro **toma a casa**: enquanto queima, só o fogo existe ali (uma armadilha ou um portal debaixo dele não agem). O seu próprio fogo não te queima.
- Passar pelo fogo não queima: só parar.
- **Fogo vence neve:** acender sobre a neve da Fada derrete a neve para sempre, e a Fada não consegue nevar sobre o fogo.
- **Inverno vence fogo:** o gelo do Inverno Eterno apaga o fogo negro onde chega, e não dá para acender fogo no gelo.
- O fogo negro dos outros e a **armadilha escondida** atravessam o Susanoo. A Armadura comum, o Indomável e a Bruxa Carmesim ignoram o fogo.
- A Maré Purificadora do Auric apaga o fogo.

> no código: `characters/kage/flames.ts`, `core/playerStatus.ts` (`inSusanoo`)

---

### 12. Fada Cristalina
*O encanto que cura o caminho*

**Habilidade:** Florescimento Feérico · **Carga:** 5

**O que faz**
1. As próximas **3** casas ruins à sua frente (armadilhas, escondidas e maldições ainda ativas) ficam **encantadas sob a neve, para sempre**. O mal delas some: uma escondida desaparece, uma presa por flecha se solta.
2. **Você parando** numa neve sua: ela te leva **5** casas à frente. Se essa parada cair em outra neve sua, você vai mais 5, e assim por diante. Em qualquer outra casa, a chegada não faz nada.
3. **Um oponente parando** numa neve sua fica **preso por 2 rodadas** (perde 2 vezes). Cada vez perdida suga **1** de energia dele para você (o que não couber na sua barra se perde).
4. Nos dois casos, sua habilidade ganha **+1** de carga.

**Inverno Eterno**
- Quando um Florescimento deixa **nenhuma casa ruim à sua frente**, começa o Inverno Eterno (uma vez por partida).
- A cada rodada, as próximas **6** casas do caminho principal congelam, do início em direção à chegada (a chegada nunca congela).
- Depois que o Inverno começou, a habilidade muda: em vez de nevar, ela **congela 1 casa à sua escolha** em qualquer ponto do caminho principal (que não esteja congelada ou com neve). Pode ser até uma casa com **fogo negro**: o inverno é superior e apaga o fogo.
- Uma casa congelada (escolhida ou tomada pelo avanço do gelo) funciona **exatamente como a neve**: você parando nela avança **5** (e encadeia em outra neve ou gelo seu), o oponente fica preso **2 rodadas** sugado como na neve, e sua habilidade ganha **+1** de carga.

**Detalhes e exceções**
- Passar por cima da neve não conta: só parar.
- Protegidos e a Bruxa não ficam presos na neve.
- Sozinha, toda neve é sua.
- A **Erva Curativa** (e a Aurora Divina) solta quem está preso.
- O fogo negro derrete a neve. A **Maré Purificadora** também lava a neve, e aí a armadilha que estava debaixo **volta a funcionar** (uma escondida encantada, não: ela já tinha sumido). O gelo do Inverno não é lavado.

> no código: `characters/fairy/winter.ts`

---

### 13. Zéfiro
*O vento sempre a favor*

**Habilidade:** Vento a Favor · **Carga:** 3

**O que faz**
1. Use antes de rolar: a rolagem desta vez anda **+4** casas.

**Detalhes e exceções**
- Soma com os bônus de cartas, Asas e coroa.
- Vale só para a vez em que foi usada.

> no código: `abilities/basic.ts` (`rollBonus`)

---

### 14. Têmis
*A Juíza Vendada*

**Habilidade:** Veredito Silencioso · **Carga:** 4 · **Reativa** (não tem botão de usar)

**O que faz**
1. Ao carregar, o veredito **se arma sozinho, em segredo**: os oponentes veem `?` no lugar da carga dela (só aparece na vez dela), e nem banner nem log anunciam que ficou pronto.
2. Armado, a **próxima** carta ou habilidade que um oponente **mirar nela** é anulada e **se volta contra quem mirou**. O veredito se gasta.
   - **Rajada Arcana:** quem jogou é que recua.
   - **Clarão Ofuscante** e **Distorção Temporal:** quem mirou é que perde a vez (ou anda de ré). Como acontece antes de rolar, a vez dele acaba na hora, e ele perde a próxima.
   - **Chamado do Abismo** e **Arrastar ao Inferno:** quem mirou é que desce ao inferno.
   - **Aposta do Coringa** (quando ganha): o Coringa é que entrega as cartas para ela.
   - **Troca de Destinos:** só é anulada (a troca não tem lado para inverter).

**Desarmado**, ela sofre tudo normalmente (Clarão, Distorção Temporal, empurrões…).

**Passiva, a Balança Cega**
- Armadilhas **escondidas** no caminho dela (rolagem, casa de avanço, Passo do Vento) são **desarmadas** para sempre, sem dano, e cada uma dá **+1 de energia**. Desarmar conta como armadilha para o Vazio do Zarek.

**Detalhes e exceções**
- Só dispara com o que é **mirado nela**. Chuva de Flechas, atropelo do Bjorn, selos, aparições, neve, gelo, fogo e as fendas do Zarek seguem normais.
- As proteções de quem mirou (Indomável, armadura…) não o salvam do veredito.
- Se ela já estiver protegida (armadura, Égide…), o ataque é só bloqueado e o veredito fica guardado.

> no código: `characters/themis/verdict.ts` (`passVerdict`, `senseHiddenTraps`)

---

### 15. Akane
*Lição decorada, carta na mão*

**Habilidade:** Revisão Relâmpago · **Carga:** 3

**O que faz**
1. Compra **2** cartas na hora.

**Detalhes e exceções**
- Com a mão cheia, entra a fila de descarte.

> no código: `abilities/basic.ts` (`studySession`)

---

### 16. Bjorn Presa-Gélida
*Quem fica no caminho, voa*

**Habilidade:** Indomável · **Carga:** 5

**Passiva: atropelo**
- Todo oponente que você **atravessa ou em quem para**, andando para a frente (dado, Passo do Vento, Vendaval), volta **6** casas na hora.
- Quem está na casa de onde você sai não é atropelado.
- Protegidos não são atropelados.
- Andando para trás (tempo invertido) não há atropelo.

**O que faz (ativa)**
1. Por **3 rodadas** (contando esta), **nada te atinge**:
   - armadilhas (escondidas também: ela se revela e muda de lugar), maldições, perde a vez;
   - neve, gelo, fogo, selos, aparições;
   - tudo o que os outros mirarem (BLOQUEADO), inclusive a Engrenagem do Tempo.
2. As bênçãos continuam valendo.
3. Se o tempo do seu dado estava invertido pelo Cronos, ele volta a andar para a frente.

**Detalhes e exceções**
- Enquanto o Indomável dura, a carga **não sobe**: ela recomeça só depois que ele acaba. A casa de habilidade ainda carrega.

> no código: `characters/bjorn/untamed.ts`, `board/landing.ts`

---

### 17. Auric
*Senhor das marés douradas*

**Habilidade:** Maré Purificadora · **Carga:** 5

**O que faz**
1. Uma onda varre a **sua casa e as 20 à frente**.
2. Tudo o que foi lançado ali some, **de quem quer que seja** (seu também):
   - fogo negro;
   - neve da Fada;
   - aparições;
   - selos;
   - flechas que prendem armadilhas.

**Detalhes e exceções**
- Varre feitiços, não o tabuleiro: armadilhas comuns, maldições e escondidas ficam.
- Uma armadilha solta da flecha ou da neve **volta a funcionar**. A escondida que estava presa muda de lugar.
- O gelo do Inverno Eterno não é afetado, nem as armadilhas destruídas.

> no código: `characters/auric/cleansingTide.ts`

---

### 18. Seraphiel
*Asas que abençoam o caminho*

**Habilidade:** Bênção do Serafim · **Carga:** 3

**O que faz**
1. Um presente aleatório do céu, com **50%** de chance para cada lado:
   - **uma bênção** (Asas, Auréola, Inspiração ou Fonte de Luz, ao acaso);
   - **uma relíquia do céu** (Luz Celestial, Égide Celestial ou Ascensão), na mão.

**Passivas**
- **Filho do céu:** suas bênçãos duram **6 rodadas** (as dos outros, 3).
- **Escolha divina:** no céu, numa casa de bênção você **escolhe** qual das quatro receber, e numa casa de relíquia qual das **três** relíquias. Os outros recebem só o que a casa tem.
- **Coroa Seráfica:** ao **sair do céu**, você ganha a coroa: **+1** casa em **toda** rolagem até o fim da partida (uma vez só).
- **Cuidado com o inferno:** se pisar no inferno, de qualquer jeito (portal, arrastado, Portal Místico), você **cai para sempre** e vira o Anjo Caído (abaixo).

> no código: `characters/seraphiel/` (`seraph.ts`, `blessing.ts`), `board/blessings.ts`

#### 18b. Anjo Caído (a Queda de Seraphiel)

**Habilidade:** Arrastar ao Inferno · **Carga:** 7

**A Queda**
- Ao cair, Seraphiel perde todas as bênçãos.
- A coroa vira a **Coroa Infernal**, também **+1** em toda rolagem, mesmo que ele nunca tenha tido a seráfica.
- A habilidade passa a ser o Arrastar ao Inferno. A carga que ele tinha continua, mas agora o ciclo é 7.

**O que faz**
1. Escolha um oponente que esteja no **caminho principal**. Quem já está no céu ou no inferno escapa e nem aparece na lista.
2. Uma mão do inferno o leva à **1ª casa do inferno**.
3. Ele precisa andar o inferno inteiro, mas **sai exatamente na casa de onde foi tirado**: o inferno custa tempo e maldições, não terreno. Empurrado para trás da 1ª casa, ele também cai nessa casa.

**Detalhes e exceções**
- Mirar num protegido: BLOQUEADO, habilidade gasta.
- **Sem ninguém para arrastar** (sozinho, todos em reinos, ou tabuleiro sem inferno), o inferno engole as próximas **2** armadilhas à sua frente, para sempre.
- A carta **Chamado do Abismo** faz o mesmo arrasto (qualquer personagem pode usar).

**Passivas do Anjo Caído**
- **O inferno é dele:** maldições, armadilhas e perde a vez do inferno não o atingem.
- **O céu está fechado:** parando num portal do céu, ele não entra e fica **acorrentado por 3 rodadas** (perde 3 vezes, em pé). A Erva Curativa solta.
- **Coroa Infernal:** +1 em toda rolagem.

> no código: `characters/seraphiel/seraph.ts` (`fallIfInHell`, `hellsDrag`, `dragIntoHell`), `board/landing.ts`

---

### 19. Cronos
*O tempo gira a seu favor*

**Habilidade:** Engrenagem do Tempo · **Carga:** 7

**O que faz**
1. Escolha um oponente **no mesmo lugar** que você (tabuleiro, céu ou inferno).
2. Escolha o que fazer com o tempo dele:
   - **Parar:** ele perde as próximas **2** vezes.
   - **Inverter:** as próximas **2** rolagens dele andam **para trás**. O Passo do Vento dele também sopra para trás.
3. Soma com o que ele já tinha (vezes perdidas ou rolagens invertidas).

**Detalhes e exceções**
- Mirar num protegido (Indomável, Susanoo, Armadura, Égide): BLOQUEADO, habilidade gasta.
- **Sem ninguém ao alcance** (sozinho ou todos em outro lugar), você **joga de novo** depois desta vez.
- Depois de parar ou inverter alguém, a carga fica **segurada** pelas suas **2** vezes seguintes, e só então volta a subir. A casa de habilidade ainda carrega.
- O Indomável do Bjorn desfaz o tempo invertido.

> no código: `characters/cronos/timeWarp.ts`, `core/turn.ts` (`chargeHeld`)

---

### 20. Unidade Alva
*Alvo travado*

**Habilidade:** Canhão de Plasma · **Carga:** 5

**O que faz**
1. Destrói **para sempre** as próximas **2** armadilhas à sua frente, inclusive as escondidas, mas não as maldições.
2. Empurra **6** casas para trás o oponente **mais adiantado** ao alcance (no mesmo lugar e não protegido).

**Detalhes e exceções**
- O empurrão é efeito em área: se o mais adiantado estiver protegido, o tiro vai no próximo mais adiantado sem proteção, e não há BLOQUEADO.
- Sem oponente ao alcance, só as armadilhas são destruídas.

> no código: `characters/alva/plasmaCannon.ts`, `board/traps.ts` (`blastTrapsAhead`)

---

## 6. Glossário

| Termo | Significado |
|---|---|
| **Sua vez** | O momento em que você joga. Termina quando você rola o dado. |
| **Rodada / turno** | Todos jogam uma vez. Durações e cargas contam nas suas vezes. |
| **Vez extra** | Jogar de novo logo em seguida. Conta como mais uma vez sua. |
| **Vez perdida** | Pular a vez. Não carrega, não dá energia, não desconta nada. |
| **Carga / ciclo** | Quantas vezes suas a habilidade leva para ficar pronta. |
| **Mesmo lugar** | Os dois no caminho principal, ou os dois no mesmo reino. |
| **Reino** | O corredor do céu ou do inferno, isolado do tabuleiro. |
| **Ameaça** | Armadilha, armadilha escondida ou maldição. |
| **Mira / mirar** | Carta ou habilidade que escolhe um oponente como alvo. |
| **Protegido** | Sob Armadura Espectral, Égide Celestial, Susanoo ou Indomável. |
| **BLOQUEADO** | Aviso de que a mira acertou um protegido: carta ou habilidade gasta à toa. |
| **Empurrar** | Mover alguém para trás. A casa onde ele cai não tem efeito. |
| **Lançamento** | Carta que muda como o dado é rolado. Uma por vez. |
| **Bônus** | Carta que soma casas à rolagem. Acumulam. |
| **Fila de descarte** | Cartas que chegaram com a mão cheia, cada uma esperando você descartar. |
| **Fundida** | Carta feita de 3 cópias iguais, muito mais forte. |
| **Relíquia** | Carta divina, só achada no céu. |
| **Ressuscitada** | Carta trazida pelo Necromante. Some ao sair da mão. |
