# Battle Dice: visão geral completa

Um resumo de tudo o que existe no jogo hoje (23/10/2026): a dinâmica, o tabuleiro, os mapas, o céu e o inferno, as cartas, a fusão, os 20 personagens (estilo, habilidade, animações, efeitos e cenário de cada um), as telas, o que falta e as ideias em aberto.

Serve para passar contexto a outras IAs (Gemini, ChatGPT…) e pedir ideias. As regras detalhadas, com todas as exceções, estão em [regras.md](regras.md). Se este resumo e o código discordarem, vale o código.

## Sumário

1. [O jogo em poucas palavras](#1-o-jogo-em-poucas-palavras)
2. [Como funciona uma partida](#2-como-funciona-uma-partida)
3. [O tabuleiro e as casas](#3-o-tabuleiro-e-as-casas)
4. [Céu e inferno](#4-céu-e-inferno)
5. [Mapas (cenários)](#5-mapas-cenários)
6. [Cartas e fusão](#6-cartas-e-fusão)
7. [Proteções e a regra do BLOQUEADO](#7-proteções-e-a-regra-do-bloqueado)
8. [Animações: o que cada clipe significa](#8-animações-o-que-cada-clipe-significa)
9. [Os 20 personagens](#9-os-20-personagens)
10. [Como os poderes se enfrentam](#10-como-os-poderes-se-enfrentam)
11. [Telas, câmera e som](#11-telas-câmera-e-som)
12. [Tecnologia e como os assets são feitos](#12-tecnologia-e-como-os-assets-são-feitos)
13. [O que falta e problemas em aberto](#13-o-que-falta-e-problemas-em-aberto)
14. [Ideias ainda não decididas](#14-ideias-ainda-não-decididas)
15. [Futuro do projeto](#15-futuro-do-projeto)
16. [Decisões já tomadas (para quem for sugerir ideias)](#16-decisões-já-tomadas-para-quem-for-sugerir-ideias)

---

## 1. O jogo em poucas palavras

- **Battle Dice** é um jogo de tabuleiro 3D com dados, cartas e personagens com poderes. A visão do autor: **"Yu-Gi-Oh com RPG e tabuleiro"**.
- É uma **corrida**: todos começam na casa 1 e vence quem chegar primeiro à última casa. Não é preciso tirar o número exato.
- Cada jogador escolhe **1 de 20 personagens**, cada um com **uma habilidade** própria (e alguns com passivas). O mesmo personagem pode ser escolhido por mais de um jogador.
- Cada jogador tem **um baralho**, uma mão de cartas e uma barra de **Energia** que paga as cartas.
- O caminho tem casas boas e ruins, **portais** que levam ao **céu** (só coisas boas) ou ao **inferno** (só coisas ruins), armadilhas escondidas, e os jogadores atrapalham uns aos outros com cartas e habilidades.
- Hoje: **1 a 4 jogadores no mesmo computador** (passando a vez, "hot-seat"). O multiplayer online está planejado.
- Tema: fantasia mágica e antiga, de forma genérica. **Não** é Dragon Ball nem outra franquia: nomes de cartas e personagens devem ser genéricos.
- O recurso se chama **Energia** (não "ki" nem "chakra").

## 2. Como funciona uma partida

### Vez, rodada e turno

- **Sua vez:** o momento em que você joga.
- **Rodada** (o jogo e o autor também chamam de **turno**): uma volta completa da mesa, todo mundo joga uma vez.
- Durações ("por 3 rodadas") e cargas de habilidade contam nas **suas** vezes.
- **Vez extra** conta como mais uma vez sua (carrega, dá energia, desconta durações).
- **Vez perdida** não conta para nada: tudo fica congelado até você voltar a jogar.

### O que se faz na sua vez

Antes de rolar o dado, em qualquer ordem:

1. **Jogar 1 carta** (2 com a habilidade da Encantadora).
2. **Usar a habilidade**, se estiver carregada (não encerra a vez).
3. **Fundir cartas** (3 cópias iguais viram 1 carta fundida; é grátis e não conta como a carta da vez).

Por fim, **rola o dado**: anda, resolve a casa onde parou e a vez passa. **Rolar é o que encerra a vez.**

### Como se avança casas

- **Dado:** um dado comum de 6 faces, em 3D, que rola na tela.
- **Cartas de lançamento** mudam o jeito de rolar (só uma por vez): 2 dados somados, 2 dados ficando com o maior, ou escolher o valor.
- **Cartas de bônus** somam casas e se acumulam entre si e com uma de lançamento (combo).
- Ordem do cálculo: **dado → + bônus** (cartas, Vento a Favor do Zéfiro, Asas Celestiais, coroa do Seraphiel) **→ × Fúria Adormecida** do Monge (triplo), se estiver em uso.
- Outras formas de andar: carta **Passo do Vento** (+3), **Vendaval** (+9), casas de **avanço** (2 a 5 casas), **portais**, **Portal Místico**, a **neve da Fada** (a Fada é levada 5 casas), o selo **Ruína** jogando sozinho.
- **Andar** é ir casa por casa para a frente; a casa onde você **para** tem efeito. Passar por cima quase nunca faz nada (as exceções são as aparições do Guardião, o atropelo do Bjorn e as flechas presas da Arqueira).
- **Ser empurrado** é voltar casa por casa, e a casa onde você cai **não tem efeito**.
- **Destinos não encadeiam**: o destino de um portal, armadilha ou avanço nunca dispara outro efeito.
- Teleportes (Troca de Destinos, ser arrastado ao inferno) não ativam a casa de chegada.
- **Tempo invertido** (Cronos): as próximas rolagens do alvo andam para trás.

### Energia

| Regra           | Valor                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Energia inicial | 1                                                                                                                                                     |
| Máximo          | 10                                                                                                                                                    |
| Ganho natural   | +1 a cada 2 vezes suas                                                                                                                                |
| Outras fontes   | Casa de energia (+2), Erva Curativa (+6), Fonte de Luz (+1 por vez), Luz Celestial (enche), alguns personagens roubam energia                         |
| Perdas          | Armadilha de dreno (−2), maldição de dreno (−2), fogo negro (−2), selo Pacto de Sangue (−2), aparição da Fome (tudo), neve da Fada (−1 por vez presa) |

### Carga da habilidade

- A carga sobe **+1 no começo de cada vez sua**. Ao chegar no ciclo, a habilidade fica **pronta** e espera até você usar (não acumula além disso).
- Usar zera a carga.
- Atalhos: **casa de habilidade** (+1), bênção **Inspiração Divina** (carga em dobro), carta **Ascensão** (pronta na hora).
- Duas habilidades seguram a carga depois de usadas: **Indomável** (Bjorn) e **Engrenagem do Tempo** (Cronos).
- Há um **modo teste** ("Habilidades carregadas") que começa com todas prontas.

| Ciclo | Habilidades                                                                                                                                                                                                |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3     | O Vazio (+1 por armadilha), Conjuração Dupla, Vento a Favor, Revisão Relâmpago, Bênção do Serafim, Transmutação, Aposta do Coringa |
| 4     | Veredito Silencioso (reativo, carga secreta) |
| 5     | Levitação Carmesim, Fúria Adormecida, Chuva de Flechas, Ressurreição, Escritura dos 4 Selos, Aparições Espectrais, Florescimento Feérico, Maré Purificadora, Indomável, Canhão de Plasma |
| 6     | Despertar Ocular                                                                                                                                                                                           |
| 7     | Arrastar ao Inferno, Engrenagem do Tempo                                                                                                                                                                   |

### Jogando sozinho

Dá para jogar com 1 jogador. Nesse caso as cartas que miram oponentes saem do baralho, e várias habilidades mudam (os selos e aparições passam a **recompensar** quem pisa, a Aposta compra cartas, o Cronos ganha uma vez extra…). Cada ficha da seção 9 diz como.

## 3. O tabuleiro e as casas

### Modos de jogo

| Modo                 | Tamanho   | Como é                                                                                                                                             |
| -------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Treino**           | 20 casas  | Partida curta para aprender: 2 cartas, 2 energias, 1 portal do inferno (5 → 10), 1 do céu (15 → 19), 2 armadilhas e 1 zona com armadilha escondida |
| **Torneio do Poder** | 200 casas | Jornada longa, gerada por sorteio com semente fixa: **o tabuleiro é sempre igual**                                                                 |

Contagem do Torneio do Poder:

| Tipo                           | Quantidade                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Portais                        | 12 (6 inferno + 6 céu, alternando; nenhum antes da casa 25; saltam de 8 a 20 casas) |
| Armadilhas                     | 13 (6 descartam carta, 4 drenam energia, 3 só mandam de volta), recuam 5 a 18 casas |
| Avanços                        | 12 (2 a 5 casas)                                                                    |
| Cartas                         | 20                                                                                  |
| Energia                        | 16                                                                                  |
| Habilidade                     | 7                                                                                   |
| Vez extra                      | 7                                                                                   |
| Perde a vez                    | 6                                                                                   |
| Zonas de armadilhas escondidas | 3 zonas de 10 casas, com 2 armadilhas escondidas cada                               |

### Tipos de casa

| Casa                     | O que faz                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Início / Chegada         | Lisas. Chegar à última vence.                                                                                                  |
| Portal                   | Abre o corredor do céu ou do inferno (seção 4)                                                                                 |
| Armadilha                | Manda de volta para uma casa anterior. Algumas são **amaldiçoadas**: também descartam 1 carta aleatória ou drenam 2 de energia |
| Avanço                   | Anda até o destino, casa por casa                                                                                              |
| Vez extra                | Joga de novo                                                                                                                   |
| Perde a vez              | Perde a próxima vez (o personagem **senta no próprio trono** enquanto espera)                                                  |
| Carta                    | Compra 1 carta                                                                                                                 |
| Energia                  | +2 de energia                                                                                                                  |
| Habilidade               | +1 de carga                                                                                                                    |
| Armadilha escondida      | Parece lisa. Quem para nela volta 5 casas, ela se revela e **muda de lugar** dentro da zona                                    |
| Maldição (só no inferno) | Descarta 1 carta ou drena 2, sem mandar de volta                                                                               |
| Bênção (só no céu)       | Uma das 4 bênçãos                                                                                                              |
| Relíquia (só no céu)     | Ganha aquela carta divina                                                                                                      |

### Visual das casas

As casas são **lajes de pedra da própria estrada**, afundadas na terra, cada uma com uma **runa acesa** que indica o tipo e o número na borda. O nome do efeito aparece numa etiqueta ao passar o mouse. A trilha **serpenteia** (fileiras com curvas em meia-volta) e a câmera acompanha o jogador. As zonas de armadilhas escondidas têm um visual rachado de brasa (vê-se a zona, não a armadilha).

## 4. Céu e inferno

- Um portal não teleporta direto: ele abre um **corredor de 18 casas** fora do caminho principal. Você entra na 1ª casa e anda pelo corredor com o dado.
- Existe **um só céu e um só inferno** por tabuleiro: todos os portais do mesmo tipo dão no mesmo corredor, e jogadores de portais diferentes andam pelas mesmas casas.
- **Cada um sai pelo próprio portal**: ao passar da última casa, você volta ao caminho principal no destino do portal por onde entrou.
- **O reino é isolado**: quem está num reino só alcança (e só é alcançado por) quem está no mesmo reino.
- Visual: os corredores ficam fora do tabuleiro e só aparecem quando há alguém neles. O céu é um claustro aberto e largo (piso arredondado, balaustrada, colunas e arcos dourados, abside curva). O inferno é um corredor fechado. O mundo (céu, luzes, partículas) muda para o clima do reino do jogador que a câmera acompanha.

### No inferno: só tira

Todas as 18 casas fazem mal: **maldições** (descarte ou dreno de 2), **perde a vez** e **armadilhas** que recuam 2 a 4 casas dentro do corredor (algumas amaldiçoadas). O padrão gira conforme o portal, então cada inferno é um pouco diferente. O Escudo Arcano bloqueia as armadilhas do inferno, mas não as maldições.

Quem pode mandar alguém ao inferno: o **Anjo Caído** (habilidade Arrastar ao Inferno) e a carta **Chamado do Abismo**. O arrastado anda o inferno inteiro e sai **na casa de onde foi tirado** (perde tempo, não terreno).

### No céu: só dá

As 18 casas alternam as **4 bênçãos** e as **3 relíquias**.

| Bênção                | Efeito (3 rodadas; 6 para o Seraphiel)                    |
| --------------------- | --------------------------------------------------------- |
| **Asas Celestiais**   | +2 casas em cada rolagem                                  |
| **Auréola Sagrada**   | Armadilhas (escondidas também) e maldições não te atingem |
| **Inspiração Divina** | A habilidade carrega em dobro                             |
| **Fonte de Luz**      | +1 de energia no começo de cada vez                       |

- As bênçãos **esperam enquanto você está no céu**: só começam a valer, e a contar, quando você volta ao caminho (o autor quis assim para não valer a pena sair do céu correndo).
- Bênçãos iguais **se acumulam**: cada cópia conta o próprio tempo, e Asas e Fonte somam por cópia.
- As **relíquias** (Luz Celestial, Égide Celestial, Ascensão) nunca vêm no baralho: só se ganham no céu (seção 6).
- O autor acha o céu **"sem graça"** (só bênçãos fixas, sem decisões). Há ideias na seção 14.

## 5. Mapas (cenários)

O jogador escolhe o mapa na tela de nova partida. **As regras e as casas são as mesmas em todos**: só o mundo em volta muda. Todos usam kits gratuitos (licença CC0) da KayKit e da Kenney, mais modelos próprios.

| Mapa                        | Como é                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ilha Encantada** (padrão) | Uma ilha numa **noite fechada** de tempestade: céu nublado e frio, poucas estrelas, mar escuro e névoa que engole o horizonte. A trilha sai de uma **vila** (casas, taverna, moinhos, praça de largada com portão), atravessa uma **floresta** com acampamento (tendas, fogueiras, troncos caídos), cruza um **riacho** por pontes de madeira com moinho d'água, e chega aos **arredores de um castelo** perto da chegada. Montanhas nevadas atrás da largada. Costa com pedras, cais e barco a remo. Cores frias e escuras (lama, grama escura, telhados acinzentados); calor só nas fogueiras, lanternas e fumaça escura das chaminés. Sem figurantes andando. Estrada de terra com marcas de roda. |
| **Masmorra**                | Salões de pedra à luz de **tochas**, paredes em três lados, pilares, barris, baús, moedas, estandartes, poeira no ar. Estrada de lajes de pedra. Escura, sem figurantes andando. |
| **Terra Devastada**         | Uma cidade em **ruínas** depois do fim do mundo, sob um céu baixo de fuligem: prédios destruídos, **carros abandonados** enferrujados à beira da estrada, árvores mortas, cercas, barracos, cestos de fogo com fumaça escura e cinzas caindo. Asfalto rachado. Sem figurantes andando. |

A luz é a mesma em todos: luar frio, pouca luz ambiente e névoa mais perto (2026-10-29, pedido de um tom mais sombrio e menos infantil). Ainda não feito: iluminação própria por mapa (masmorra mais quente, terra devastada alaranjada). Kits baixados e ainda sem uso: Kenney Castle, Fantasy Town, Modular/Mini Dungeon, KayKit City Builder.

## 6. Cartas e fusão

### Básico

| Regra          | Valor                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Mão inicial    | 6 cartas                                                                                                            |
| Limite da mão  | 8 (chegando carta com a mão cheia, o jogo pausa e você escolhe o que descartar; várias de uma vez entram numa fila) |
| Cartas por vez | 1 (2 com a Conjuração Dupla); fundir não conta                                                                      |
| Baralho padrão | 26 cartas com oponentes, 20 sozinho                                                                                 |
| Descarte       | Carta jogada vai para a pilha de descarte; quando o baralho acaba, o descarte é embaralhado e vira o baralho novo   |

| Raridade | Nível | Custo | Cópias no baralho |
| -------- | ----- | ----- | ----------------- |
| Comum    | 1     | 1     | 3                 |
| Incomum  | 2     | 2     | 2                 |
| Rara     | 3     | 2     | 2                 |
| Épica    | 4     | 3     | 1                 |
| Lendária | 5     | 4     | 1                 |

Na tela: as cartas ficam numa mão flutuando ao lado da tela; o 1º clique puxa a carta, o 2º joga. A compra mostra a carta saindo do baralho, virando no meio da tela e indo para a mão. Cartas têm estrelas de raridade; as relíquias têm moldura divina e as fundidas, moldura de fogo.

### Catálogo (15 cartas)

| Carta                   | Raridade | Custo | Tipo       | Efeito                                                                                     |
| ----------------------- | -------- | ----- | ---------- | ------------------------------------------------------------------------------------------ |
| **Passo do Vento**      | Comum    | 1     | Movimento  | Avance 3 casas (a casa onde parar tem efeito)                                              |
| **Erva Curativa**       | Comum    | 1     | Cura       | +6 de energia e cancela as vezes perdidas (solta da neve e das correntes)                  |
| **Amuleto da Sorte**    | Comum    | 1     | Bônus      | +2 na próxima rolagem                                                                      |
| **Escudo Arcano**       | Incomum  | 2     | Defesa     | A próxima armadilha não tem efeito (não bloqueia maldições)                                |
| **Pergaminho Antigo**   | Incomum  | 2     | Compra     | Compre 2 cartas                                                                            |
| **Olho do Oráculo**     | Incomum  | 2     | Lançamento | Role 2 dados e fique com o maior                                                           |
| **Rajada Arcana**       | Incomum  | 2     | Mira       | Empurre um oponente 7 casas para trás                                                      |
| **Fúria Selvagem**      | Rara     | 2     | Lançamento | Role 2 dados e some os dois                                                                |
| **Clarão Ofuscante**    | Rara     | 2     | Mira       | O oponente perde a próxima vez                                                             |
| **Portal Místico**      | Épica    | 3     | Movimento  | Vá direto ao próximo portal à frente e atravesse-o (pula portais cobertos de fogo ou gelo) |
| **Runa do Destino**     | Épica    | 3     | Lançamento | Escolha o valor (1 a 6) da próxima rolagem                                                 |
| **Despertar Ancestral** | Épica    | 3     | Bônus      | +3 nas próximas 2 rolagens                                                                 |
| **Chamado do Abismo**   | Épica    | 3     | Mira       | Arraste ao inferno um oponente do caminho principal                                        |
| **Troca de Destinos**   | Lendária | 10    | Mira       | Troque de lugar com um oponente                                                            |
| **Luz Celestial**       | Relíquia | 0     | Energia    | A energia enche até o máximo                                                               |
| **Égide Celestial**     | Relíquia | 2     | Defesa     | Por 3 rodadas, nada que os oponentes mirarem em você funciona                              |
| **Ascensão**            | Relíquia | 2     | Habilidade | A habilidade fica pronta na hora                                                           |

As **relíquias** só se ganham no céu (ou pela Bênção do Seraphiel e pela Transmutação de nível 5). Contam como lendárias.

### Fusão: sim, existe

Com **3 cópias** da mesma carta na mão, você pode fundi-las numa **carta fundida**, muito mais forte. É grátis, a qualquer momento da sua vez, e não conta como a carta da vez. Ela custa o mesmo que a original, não funde de novo e, depois de jogada, volta ao descarte ainda fundida (as 3 cópias viram 1 no baralho). A tela mostra as 3 cópias voando juntas, um clarão com anéis de fogo e a carta nova revelada.

| Carta             | Fundida                 | Efeito                                                               |
| ----------------- | ----------------------- | -------------------------------------------------------------------- |
| Passo do Vento    | **Vendaval**            | Avance 9 casas                                                       |
| Erva Curativa     | **Elixir da Vida**      | Energia cheia e cancela vezes perdidas, neve e correntes             |
| Amuleto da Sorte  | **Trevo Dourado**       | +10 na próxima rolagem                                               |
| Escudo Arcano     | **Égide Arcana**        | Escudo Arcano + Armadura Espectral por 2 rodadas                     |
| Pergaminho Antigo | **Grimório Proibido**   | Compre 5 cartas                                                      |
| Rajada Arcana     | **Tempestade Arcana**   | Empurre um oponente 15 casas                                         |
| Luz Celestial     | **Aurora Divina**       | Energia cheia, habilidade pronta, livre das vezes perdidas e da neve |
| Égide Celestial   | **Santuário Celestial** | Égide por 6 rodadas + Escudo Arcano                                  |
| Ascensão          | **Apoteose**            | Habilidade pronta e uma vez extra                                    |

Só essas fundem. O baralho tem 3 cópias de Passo, Erva e Amuleto, mas só 2 de Escudo, Pergaminho e Rajada: a terceira tem que vir de outro jeito (Transmutação, roubo, Ressurreição). O autor quer as fundidas **bem fortes** ("roubadas").

### Quando uma carta não pode ser jogada

Silenciado (selo do Escriba), sem energia, Escudo Arcano já erguido, carta de lançamento com outra esperando, Portal Místico sem portal à frente, Luz Celestial com energia cheia, Ascensão com a habilidade pronta, Chamado do Abismo sem inferno no tabuleiro.

## 7. Proteções e a regra do BLOQUEADO

| Proteção                  | De onde vem                                    | Duração                 | Bloqueia                                                                                                                                       | Não bloqueia                                                        |
| ------------------------- | ---------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| **Escudo Arcano**         | Carta, fusões                                  | Até a próxima armadilha | 1 armadilha (comum, escondida ou do inferno)                                                                                                   | Maldições, perde a vez, o que é mirado                              |
| **Armadura Espectral**    | Égide Arcana (2), Égide Celestial | Rodadas                 | Tudo o que **os outros** fazem contra você: cartas e habilidades miradas, selos, aparições, neve e gelo, fogo negro, atropelo, flechas, canhão | Armadilhas, maldições e perde a vez do tabuleiro                    |
| **Égide Celestial**       | Relíquia                                       | 3 rodadas (6 fundida)   | O mesmo da Armadura                                                                                                                            | O mesmo                                                             |
| **Susanoo**               | Kage Rubra                                     | 3 rodadas               | Tudo o da Armadura **mais** armadilhas, maldições e perde a vez. Ninguém para na casa dela                                                     | A armadilha escondida e o fogo negro de outro ("atacam por dentro") |
| **Indomável**             | Bjorn                                          | 3 rodadas               | Praticamente tudo                                                                                                                              | Nada de ruim (as bênçãos continuam)                                 |
| **Auréola Sagrada**       | Bênção do céu                                  | 3 rodadas               | Armadilhas e maldições                                                                                                                         | Perde a vez, o que é mirado                                         |
| **Levitação**             | Bruxa Carmesim                                 | 2 vezes                 | O efeito de qualquer casa onde ela para (inclusive as boas)                                                                                    | Aparições, atropelo, empurrões, cartas miradas                      |
| **Anjo Caído no inferno** | Passiva                                        | Sempre                  | Tudo do inferno                                                                                                                                | Fora do inferno, nada                                               |
| **O Vazio**               | Zarek                                          | Reativa                 | Armadilha, maldição ou perde a vez, à escolha dele: vai para o Vazio | O que é mirado |

**A regra do BLOQUEADO** (decidida pelo autor):

1. Cartas e habilidades que miram um oponente **sempre deixam escolher** oponentes protegidos. O jogo não esconde ninguém: o jogador precisa prestar atenção.
2. Mirar num protegido **gasta** a carta ou a habilidade, não faz nada e mostra **BLOQUEADO!**.
3. Oponentes em outro reino nem aparecem como alvo.
4. Efeitos em área (Chuva de Flechas, Canhão de Plasma, atropelo) simplesmente pulam os protegidos.

## 8. Animações: o que cada clipe significa

Os personagens são modelos 3D gerados no **Meshy AI**, com esqueleto e animações também do Meshy. Cada modelo final junta vários clipes. Efeitos (fogo, gelo, raios, asas, armas de luz…) são **feitos em código** por cima das animações.

| Clipe           | Quando toca                               | Sentido                                                                           |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------- |
| `idle`          | Parado                                    | Respirando e olhando em volta. **Todos têm**                                      |
| `run`           | Andando pelas casas                       | Corrida. **Todos têm**                                                            |
| `intro`         | Uma vez no menu, ao escolher o personagem | A "entrada" dele no palco, com efeitos sincronizados                              |
| `showcase`      | No menu, em loop depois da intro          | Pose de vitrine. **Ninguém tem ainda** (usa o `idle`)                             |
| `cast`          | Ao usar a habilidade                      | O gesto do poder; o efeito espera o momento do impacto                            |
| `float`         | Enquanto levita                           | Só a Bruxa                                                                        |
| `dash` / `land` | Impulso e pouso de um avanço relâmpago    | Só o Monge                                                                        |
| `shove`         | Ao atropelar alguém                       | Empurrão com as duas mãos. Só o Bjorn                                             |
| `knocked`       | Ao ser empurrado ou atingido              | Cai e se levanta. **Compartilhado por todos** (feito com o do Cavaleiro do Vazio) |
| `rest`          | Enquanto perde a vez                      | Sentado no próprio trono. **Compartilhado por todos** (feito com o do Auric)      |
| `hop`           | Ao parar na própria neve                  | Salto antes de ser levado. Só a Fada                                              |

**Quem não tem um clipe `cast`** faz o gesto padrão ao usar a habilidade: um **salto com giro e uma explosão de luz** na cor dele. Alguns personagens usam a habilidade **parados** de propósito (`castsStill`: Monge, Arqueira), porque o efeito já é o espetáculo.

### Quem tem o quê

| Personagem           | intro | cast                      | outros clipes | Intro feita só em código                  |
| -------------------- | ----- | ------------------------- | ------------- | ----------------------------------------- |
| Cavaleiro do Vazio   | ✅    | ✅                        |               |                                           |
| Encantadora Carmesim |       |                           |               |                                           |
| Bruxa Carmesim       |       |                           | float         | flutua no menu com o cajado               |
| Alquimista Esmeralda | ✅    | ✅                        |               |                                           |
| Monge Ancião         | ✅    | (parado)                  | dash, land    |                                           |
| Arqueira Élfica      | ✅    | (parada, clipe a caminho) |               |                                           |
| Coringa Carmesim     | ✅    |                           |               |                                           |
| Necromante           | ✅    |                           |               |                                           |
| Escriba da Carne     | ✅    |                           |               |                                           |
| Guardião das Sombras |       |                           |               |                                           |
| Kage Rubra           |       |                           |               | (animação prevista para o fim de outubro) |
| Fada Cristalina      | ✅    | ✅                        | hop           |                                           |
| Zéfiro               |       |                           |               |                                           |
| Têmis              |       |                           |               |                                           |
| Akane                |       |                           |               |                                           |
| Bjorn Presa-Gélida   | ✅    | ✅                        | shove         |                                           |
| Auric                |       |                           |               |                                           |
| Seraphiel            |       |                           |               | descida do céu                            |
| Seraphiel caído      |       |                           |               | (só existe dentro da partida)             |
| Cronos               |       |                           |               |                                           |
| Unidade Alva         |       |                           |               |                                           |

Todos têm `idle`, `run`, `knocked` e `rest`. **Completos** (intro + cast + efeitos próprios): Cavaleiro do Vazio, Alquimista, Monge, Fada e Bjorn. **Só idle e run** (sem intro nem cast próprios): Encantadora, Guardião, Kage, Zéfiro, Têmis, Akane, Auric, Seraphiel, Cronos e Unidade Alva.

## 9. Os 20 personagens

Todos são jogáveis. Cada um tem: uma **cor** (anel no chão, HUD, menus, cor do escudo), um **trono** próprio (onde senta quando perde a vez) e um **cenário** próprio no menu (o "habitat", no lugar de um pedestal genérico). Regra do autor para os cenários: **nenhum elemento repetido entre personagens**.

| #   | Personagem             | Título                                 | Habilidade                              | Carga | Cor                 |
| --- | ---------------------- | -------------------------------------- | --------------------------------------- | ----- | ------------------- |
| 1   | Zarek                  | O Cavaleiro do Vazio                   | O Vazio                                 | 3     | violeta             |
| 2   | Encantadora Carmesim   | Feiticeira de sangue                   | Conjuração Dupla                        | 3     | rosa-vermelho       |
| 3   | Bruxa Carmesim         | Senhora dos feitiços de sangue         | Levitação Carmesim                      | 5     | vermelho            |
| 4   | Alquimista Esmeralda   | Mestra das transmutações               | Transmutação                            | 3     | esmeralda           |
| 5   | Monge Ancião           | A calma antes da tempestade            | Fúria Adormecida                        | 5     | amarelo             |
| 6   | Arqueira Élfica        | Flechas que caem do céu                | Chuva de Flechas                        | 5     | verde-folha         |
| 7   | Coringa Carmesim       | Quem aposta, arrisca                   | Aposta do Coringa                       | 3     | carmesim            |
| 8   | Necromante             | O que foi jogado não morre             | Ressurreição                            | 5     | verde-água fantasma |
| 9   | Escriba da Carne       | O que ele escreve, você paga           | Escritura dos 4 Selos                   | 5     | fúcsia              |
| 10  | Guardião das Sombras   | Sem rosto, sem rastro                  | Aparições Espectrais                    | 5     | azul fantasma       |
| 11  | Kage Rubra             | O olhar que queima                     | Despertar Ocular                        | 6     | escarlate           |
| 12  | Fada Cristalina        | O encanto que cura o caminho           | Florescimento Feérico                   | 5     | ciano               |
| 13  | Zéfiro                 | O vento sempre a favor                 | Vento a Favor                           | 3     | menta               |
| 14  | Têmis                | A Juíza Vendada | Veredito Silencioso                        | 4     | azul profundo                |
| 15  | Akane                  | Lição decorada, carta na mão           | Revisão Relâmpago                       | 3     | rosa claro          |
| 16  | Bjorn Presa-Gélida     | Quem fica no caminho, voa              | Indomável (+ atropelo)                  | 5     | azul gelo           |
| 17  | Auric                  | Senhor das marés douradas              | Maré Purificadora                       | 5     | dourado             |
| 18  | Seraphiel / Anjo Caído | Asas que abençoam o caminho            | Bênção do Serafim / Arrastar ao Inferno | 3 / 7 | marfim              |
| 19  | Cronos                 | O tempo gira a seu favor               | Engrenagem do Tempo                     | 7     | bronze              |
| 20  | Unidade Alva           | Alvo travado                           | Canhão de Plasma                        | 5     | branco              |

---

### 1. Cavaleiro do Vazio

- **Estilo:** guerreiro sombrio de armadura escura, com duas espadas na cintura, ligado ao "vazio" (violeta). O autor o chama de "Guerreiro Sombrio".
- **Habilidade, O Vazio (carga 3, reativa):** cada armadilha disparada, destruída ou presa dá +1 de carga. Pronto, ao cair numa armadilha, maldição ou perde a vez, ele pode engoli-la (até 4 guardadas). Na vez dele, solta o que guardou: uma armadilha abre uma **casa nova (fenda)** no caminho, com a penalidade dobrável por 2 de energia; as fendas não o atingem. Pelo botão, **rouba** a casa de outro (fogo, neve, gelo, selo ou aparição): ela fica no lugar com o mesmo efeito, marcada pelo Vazio, mas agora a favor dele. Sem limite. A sombra do Vazio vaga pelo mapa. Regras completas em `regras.md`.
- **Animações:** intro "Julgamento da Espada" (4,4 s, com **lâminas de luz** aparecendo nas mãos, porque as espadas do modelo não se mexem); cast: **crava as duas espadas no chão** ajoelhando, com impacto aos 0,95 s.
- **Cenário:** Fenda do Vazio (obsidiana rachada com fendas violeta pulsando, lascas flutuando, vórtice de névoa). **Trono:** trono de ametista.

### 2. Encantadora Carmesim

- **Estilo:** jovem feiticeira ruiva, de vermelho, magia de sangue.
- **Habilidade, Conjuração Dupla (carga 3):** nesta vez, pode jogar **2 cartas** em vez de 1 (cada uma paga a sua energia).
- **Animações:** só idle e run. Usa o salto padrão.
- **Cenário:** Jardim de Rosas de Sangue (círculo de sangue, roseiras, vinhas com espinhos, candelabros, pétalas caindo). **Trono:** trono de rosas.

### 3. Bruxa Carmesim

- **Estilo:** bruxa de vermelho que flutua com um cajado; personagem padrão do jogo e a primeira a ser feita.
- **Habilidade, Levitação Carmesim (carga 5):** flutua por 2 vezes suas. **Nenhuma casa onde ela para tem efeito** (as ruins e também as boas: portais, bênçãos, cartas). Uma armadilha escondida embaixo dela nem se revela.
- **Passiva, pés que não tocam o chão:** a neve e o gelo da Fada e o fogo negro da Kage nunca a atingem.
- **Animações:** clipe `float` (levitação), que também é a pose dela no menu. Em jogo: subida lenta com sigilo de runas, coluna e espiral, cajado flutuando junto da palma. Escudo vermelho.
- **Cenário:** Clareira da Bruxa (floresta escura, raízes retorcidas, cogumelos vermelhos, anel de pedras, **caldeirão** borbulhando sobre o fogo). **Trono:** trono carmesim.

### 4. Alquimista Esmeralda

- **Estilo:** alquimista de verde esmeralda com frascos no cinto.
- **Habilidade, Transmutação (carga 3):** escolhe 2 cartas da mão; os níveis de raridade delas se somam (até 5) e ela ganha **uma carta aleatória desse nível** (as duas somem). Com menos de 2 cartas, ganha uma carta rara.
- **Animações:** intro: **despeja um frasco** que vira fumaça (aos 2,0 s); cast: **tira o frasco do cinto** (0,9 s) e **arremessa** (2,3 s). Em jogo, o frasco quebra no chão e uma nuvem de fumaça cobre a troca das cartas. O autor disse que ficou "perfeito".
- **Problema conhecido:** muitas vezes ela não tem cartas para transmutar (ideias na seção 14).
- **Cenário:** Laboratório Alquímico (ardósia, círculo de transmutação, bancada com frascos verdes, alambique de latão). **Trono:** trono do alquimista.

### 5. Monge Ancião

- **Estilo:** um velho de aparência inofensiva que na verdade é muito forte (a graça é a surpresa). Raios e tempestade.
- **Habilidade, Fúria Adormecida (carga 5):** a rolagem desta vez vale o **TRIPLO**, depois de todos os bônus. Ex.: Fúria Selvagem + Amuleto com 4 e 5 = (4+5+2)×3 = 33 casas.
- **Animações:** intro: **ginga de capoeira** e um **salto giratório**, com raios seguindo cada movimento dos braços e pernas, e um raio que cai do céu aos 4,8 s. Ao usar, fica **parado carregando** (campo elétrico, raios nas mãos) até rolar. Depois: clipe `dash` (impulso), ele vira um **raio que cruza o caminho** e cai do céu no clipe `land` com onda de choque. O autor disse "ficou simplesmente perfeita".
- **Cenário:** Templo da Tempestade (terraço de mosteiro, incensário, sino de bronze, bandeirinhas de oração, raios ao longe). **Trono:** trono da tempestade.

### 6. Arqueira Élfica

- **Estilo:** elfa arqueira de verde, com arco nas costas.
- **Habilidade, Chuva de Flechas (carga 5):** escolhe onde as flechas caem:
  - **nos oponentes:** todos ao alcance voltam **10** casas;
  - **nas armadilhas:** as próximas 3 ameaças à frente ficam **presas** por flechas (as escondidas se revelam). Quando alguém passa por elas, a flecha se solta e a casa volta a funcionar.
- **Animações:** intro: puxa um **arco de luz**, a flecha sobe ao céu e um anel de 12 flechas chove em volta. Em jogo: o **arco real** (modelo) sai das costas para a mão e ela atira parada; flechas de luz sobem e caem nos alvos, e a câmera acompanha a saraivada. Aguarda o clipe de "puxar e atirar" (previsto para o fim de outubro).
- **Cenário:** Clareira Élfica (musgo, raízes, tronco caído, samambaias, cogumelos brilhando, **alvo de palha** com flechas, vaga-lumes). **Trono:** trono de madeira anciã.

### 7. Coringa Carmesim

- **Estilo:** coringa (feminina) de cartas, carmesim e preto, circense.
- **Habilidade, Aposta do Coringa (carga 3):** escolhe um oponente e rola o **dado da sorte**: 1–2, ele leva 1 carta sua; 3–5, você rouba 2 cartas aleatórias dele; **6 (JACKPOT)**, você rouba 2 cartas, épicas primeiro. Se ninguém puder ser roubado, existe o **Lance da Sorte**: só rola e compra tantas cartas quanto o dado mostrar. Sozinho: perder descarta 1, ganhar compra 2, jackpot cria 2 épicas.
- **Animações:** intro: agacha, faz uma **pirueta** e uma pose com a mão erguida; um anel de **cartas** gira em volta, sobe em espiral e se junta na mão dela.
- **Planejado:** mais tipos de aposta e um seletor de 3 apostas aleatórias.
- **Cenário:** Mesa de Cartas (piso arlequim carmesim e preto, cartas espalhadas e flutuando, fichas, dados, lâmpadas de circo). **Trono:** trono do coringa.

### 8. Necromante

- **Estilo:** xamã de ossos, sombrio e realista (o autor recusou um visual "fofinho").
- **Habilidade, Ressurreição (carga 5):** traz de volta para a mão 1 ou 2 cartas da **sua pilha de descarte**. Elas voltam "ressuscitadas": quando saírem da mão de novo, **viram pó** e somem do jogo.
- **Animações:** intro: ergue os braços e o chão desperta; **mãos esqueléticas** rompem a terra, **esqueletos** escalam para fora atrás dele, **caveiras** com olhos de fogo verde-pálido flutuam em volta da cabeça e se desfazem em fumaça escura.
- **Ideia:** na Ressurreição, as cartas subirem do chão em fogo verde-azulado (não feito).
- **Cenário:** Cemitério (terra revirada, lápides, cruz de madeira, covas, névoa escura). **Trono:** trono do necromante.

### 9. Escriba da Carne

- **Estilo:** escriba macabro que escreve com sangue em pele costurada; runas fúcsia.
- **Habilidade, Escritura dos 4 Selos (carga 5):** escreve 4 selos em casas que **ele escolhe clicando no tabuleiro**, até 20 casas de distância. **Para os outros, todos parecem iguais.** Quem para num selo o quebra e sofre:
  - **Dízimo:** entrega a carta mais cara para o Escriba;
  - **Ruína:** volta 10 casas;
  - **Silêncio:** não joga cartas no resto da vez e na próxima;
  - **Pacto de Sangue:** perde 2 de energia, que vai para o Escriba.
    Os selos se acumulam entre usos. Sozinho, os selos recompensam.
- **Animações:** intro de 7,7 s: um **pergaminho** se desenrola no ar e ele escreve runas com o dedo (tinta de sangue, faíscas); um **círculo ritual de sangue** se desenha no chão; ao erguer os braços, o pergaminho queima e **4 pergaminhos** voam, se abrem e queimam. Em jogo, os selos são páginas de pele costurada com um olho de sangue, garras de osso e poça de sangue.
- **Cenário:** Scriptorium (lajes, tocos de vela, páginas espalhadas, pilhas de livros). **Trono:** trono do escriba.

### 10. Guardião das Sombras

- **Estilo:** figura sem rosto, fantasmagórica, azul pálido.
- **Habilidade, Aparições Espectrais (carga 5):** invoca 2 aparições em casas escolhidas (até 20 casas): quem **passar** por elas (não precisa parar) é atingido:
  - **Pilhagem:** o Guardião escolhe 2 cartas da mão da vítima para levar;
  - **Fome:** a vítima perde **toda** a energia para ele (o que não couber na barra dele vira +1 de carga).
    **Quem passar pela casa do próprio Guardião dissipa todas as aparições dele** naquele movimento. No céu ele pode assombrar o corredor; no inferno, não.
- **Animações:** só idle e run. As aparições são figuras espectrais no tabuleiro.
- **Pergunta em aberto:** a energia da Fome deve ir toda para ele mesmo passando de 10? (seção 13).
- **Cenário:** Ruínas na Névoa (ruínas ao luar, colunas quebradas, névoa rasteira, fogos-fátuos). **Trono:** trono das sombras.

### 11. Kage Rubra

- **Estilo:** ninja de capa preta, olhar que queima (inspiração "ninja de anime": fogo negro e um espírito guardião gigante). O autor a chama de "a personagem do Naruto".
- **Habilidade, Despertar Ocular (carga 6), escolhe um de dois poderes:**
  - **Chamas Eternas:** até 2 casas em qualquer lugar do caminho pegam **fogo negro** por 10 rodadas. Quem para ali perde 2 de energia, volta 10 casas e dá +1 de carga para ela. Cada fogo apaga depois de queimar 2 vezes. Enquanto queima, **só o fogo existe** na casa.
  - **Susanoo:** por 3 rodadas, fica dentro de um espírito guardião: nada mirado funciona, nem armadilhas, maldições e perde a vez. **Ninguém para na casa dela** (é jogado 1 casa para trás), e ao parar numa casa ocupada ela empurra os outros 1 casa para a frente. Só a armadilha escondida e o fogo negro de outra pessoa atravessam.
- **Animações:** só idle e run (animação prevista para o fim de outubro). Em jogo: **fogo negro** (chama animada com coração preto e bordas de brasa) e o **Susanoo** (costelas espectrais e elmo de samurai, modelo próprio) no lugar do escudo comum.
- **Ideia:** gritar o nome do poder ao usar (falas de habilidade).
- **Cenário:** Santuário em Chamas (pátio chamuscado, **torii** vermelho, duas pequenas árvores carmesim, caminho de lajes vermelhas, cinzas, fogo negro, brasas subindo). **Trono:** trono de obsidiana.

### 12. Fada Cristalina

- **Estilo:** fada de gelo e cristal, ciano e branco prismático, com **asas** e uma **varinha de gelo**.
- **Habilidade, Florescimento Feérico (carga 5):**
  1. As próximas 3 casas ruins à frente ficam **cobertas de neve para sempre** (o mal delas some).
  2. **A Fada** parando na própria neve é **levada 5 casas** à frente (encadeia se cair em outra neve).
  3. **Um oponente** parando na neve fica **preso 2 rodadas**, e cada vez perdida passa 1 de energia dele para a Fada.
  4. Nos dois casos, +1 de carga para ela.
- **Inverno Eterno (fase final dela):** quando um Florescimento não deixa nenhuma casa ruim à frente, começa o Inverno (uma vez por partida). A cada rodada, **6 casas congelam** a partir do início em direção à chegada. Numa casa congelada nada mais acontece: a Fada e a Bruxa passam ilesas, um oponente que para ali fica preso 2 rodadas. Depois que o Inverno começou, a habilidade dela passa a **congelar 2 casas à escolha** em qualquer lugar do caminho.
- **Animações:** intro: ergue a mão com a varinha e olha para ela, com neve e pó de fada caindo; cast com a varinha na mão; `hop` (salto ao parar na própria neve, com explosão de neve). As **asas são um modelo separado batendo em código** (o Meshy estraga o esqueleto de modelos com asas). Quem fica preso na neve aparece envolto em blocos de neve que vão caindo.
- **Cenário:** Bosque de Cristal (neve sobre musgo, cristais brilhando por dentro em ciano e lilás, anel de flores luminosas). **Trono:** trono de gelo.

### 13. Zéfiro

- **Estilo:** guardião dos ventos e dos **quatro elementos** (inspiração Avatar).
- **Habilidade, Vento a Favor (carga 3):** a rolagem desta vez anda **+4** casas.
- **Animações:** só idle e run.
- **Em aberto:** trocar o Vento a Favor por **4 habilidades, uma por elemento** (água, fogo, terra, ar), ainda sem efeitos definidos. Duas formas: **rodízio** (água → fogo → terra → ar, menos forte) ou **escolher** na hora. Intro sonhada: ele "dobra" os quatro elementos em sequência.
- **Cenário:** Pico do Vento (topo de montanha, grama dobrando, os 4 elementos orbitando, folhas em espiral, nuvens abaixo). **Trono:** trono elemental.

### 14. Têmis

- **Estilo:** a **Juíza Vendada**, a deusa grega da justiça: balanças pendendo de um lado para o outro. Azul profundo.
- **Habilidade, Veredito Silencioso (carga 4, reativa e secreta):** armado, o próximo ataque mirado nela se volta contra quem mirou. Na partida, uma **balança gigante** desce entre os dois, pesa e pende para o lado do culpado, e o castigo cai sobre ele.
- **Passiva, Marca da Justiça:** quem ataca outro jogador ganha marcas; com 2, o 3º ataque vai a julgamento (volta dobrado se o veredito estiver armado, ou apaga as marcas se não estiver). Com o veredito desarmado, ela sofre tudo normalmente.
- **Animações:** intro e cast (ergue a mão direita: no jogo, aponta para quem o veredito julga), defesa (`guard`, antes de apontar), "não, não" sarcástico (`scoff`, depois de apontar, enquanto o castigo cai no atacante), freada de correr para andar (`brake`) e sentar no trono (`sit`, o trono aparece enquanto ela senta).
- **Cenário:** ainda a Praia ao Luar; vai virar um tribunal grego. **Trono:** trono da lua.

### 15. Akane

- **Estilo:** estudante de rosa, "lição decorada, carta na mão" (cadernos, ambiente japonês).
- **Habilidade, Revisão Relâmpago (carga 3):** compra 2 cartas na hora.
- **Animações:** só idle e run.
- **Cenário:** Pátio das Cerejeiras (pátio de pedra, cerejeira com pétalas caindo, cadernos abertos, lanterna de pedra). **Trono:** trono infernal.

### 16. Bjorn Presa-Gélida

- **Estilo:** berserker brutal do gelo, lobo do norte (o autor o chama de "lobão"). Força bruta.
- **Passiva, atropelo:** todo oponente que ele **atravessa ou em quem para**, andando para a frente, volta **6 casas** na hora (o Bjorn dá um empurrão com as duas mãos).
- **Habilidade, Indomável (carga 5):** por 3 rodadas **nada o atinge** (armadilhas, maldições, perde a vez, neve, gelo, fogo, selos, aparições e tudo o que for mirado). As bênçãos continuam valendo, e ele desfaz o tempo invertido do Cronos. A carga não sobe enquanto dura.
- **Animações:** intro: **soco no chão** aos 1,0 s (rachaduras, espinhos de gelo, blocos de neve, tremor de câmera, hálito frio saindo da boca); cast: **bate no peito** e uma aura de gelo o envolve (névoa, rajadas de nevasca em espiral, 18 cristaizinhos orbitando); `shove`: o empurrão do atropelo. Há uma fala gravada planejada ("INDOMÁVEL!").
- **Cenário:** Ermo Congelado (neve, cristais de gelo, rochas, névoa, nevasca, trilha pisoteada). **Trono:** trono do lobo.

### 17. Auric

- **Estilo:** **rei dos mares** dourado (inspiração Aquaman).
- **Habilidade, Maré Purificadora (carga 5):** uma onda varre a casa dele e as **20 à frente**, apagando tudo o que foi lançado ali, **de quem quer que seja**: fogo negro, neve, aparições, selos, flechas. Armadilhas soltas da neve ou da flecha voltam a funcionar. Não mexe no gelo do Inverno nem nas armadilhas do tabuleiro.
- **Animações:** só idle e run. Em jogo: uma **onda quebrando** (shader) varre o caminho. A primeira versão foi rejeitada ("rolo compressor"); a atual é a segunda.
- **Cenário:** Templo Submerso (fundo do mar com areia ondulada, pilares de runas, baú de tesouro aberto, corais, cáusticas, bolhas). **Trono:** trono das marés.

### 18. Seraphiel (e o Anjo Caído)

- **Estilo:** paladino celestial radiante, com **asas** brancas e uma **coroa** branca. Depois da Queda, vira um cavaleiro espectral carmesim com asas negras queimadas e coroa de espinhos vermelha (inspiração Castiel, de Supernatural).
- **Habilidade, Bênção do Serafim (carga 3):** 50% de chance de uma bênção aleatória do céu, 50% de uma **relíquia do céu** na mão.
- **Passivas:** suas bênçãos duram **6 rodadas** (as dos outros, 3); no céu ele **escolhe** qual bênção ou relíquia receber; ao **sair do céu**, ganha a **Coroa Seráfica** (+1 em toda rolagem até o fim da partida).
- **A Queda:** se pisar no inferno de qualquer jeito, **cai para sempre**: perde as bênçãos, a coroa vira **Coroa Infernal** (+1 também) e a habilidade vira:
  - **Arrastar ao Inferno (carga 7):** uma mão do inferno leva um oponente do caminho principal para o começo do inferno; ele anda o inferno inteiro e sai na casa de onde foi tirado. Sem alvo, o inferno engole as próximas 2 armadilhas à frente.
  - Passivas do Caído: imune a tudo do inferno; parando num portal do céu fica **acorrentado 3 rodadas**.
- **Animações:** só idle e run (os dois modelos). Intro do menu feita em código: ele **desce do céu** numa coluna de luz dourada, com batidas de asas que soltam penas e fazem o cenário balançar, e pousa no altar. Em jogo: asas batendo em código, coroa na cabeça, efeito da Queda, **mão do inferno** (mão carbonizada com veias de fogo saindo do chão rachado) e **correntes divinas** (anéis dourados e correntes presas ao chão).
- **Ideia aprovada para a intro:** pouso de super-herói com uma grande **espada celestial** na mão.
- **Atenção:** o autor acha o Seraphiel **"muito roubado"**; um enfraquecimento está para ser decidido.
- **Cenário:** Santuário (altar de mármore sobre um mar de nuvens, colunas, penas, raios de luz). **Tronos:** trono celestial; trono de cinzas depois da Queda.

### 19. Cronos

- **Estilo:** sentinela mecânico de relojoaria, bronze, engrenagens.
- **Habilidade, Engrenagem do Tempo (carga 7):** escolhe um oponente no mesmo lugar e:
  - **Parar o tempo:** ele perde as próximas 2 vezes; ou
  - **Inverter o tempo:** as próximas 2 rolagens dele andam **para trás**.
    Sem ninguém ao alcance, o Cronos joga de novo. Depois de usar, a carga fica segurada por 2 vezes.
- **Animações:** só idle e run. Em jogo, um aviso na casa do alvo.
- **Cenário:** Oficina das Engrenagens (engrenagens engatadas girando no chão, anel de algarismos cujos ponteiros às vezes voltam, globo). Falta um **relógio pendurado** atrás. **Trono:** trono de engrenagens.

### 20. Unidade Alva

- **Estilo:** mecha branco, sentinela de combate tecnológica ("alvo travado").
- **Habilidade, Canhão de Plasma (carga 5):** destrói **para sempre** as próximas 2 armadilhas à frente (inclusive escondidas) e empurra **6 casas** para trás o oponente **mais adiantado** ao alcance.
- **Animações:** só idle e run.
- **Cenário:** Hangar (plataforma de lançamento hexagonal com varredura de luz nas juntas e mira holográfica no chão). **Trono:** trono cibernético.

## 10. Como os poderes se enfrentam

O autor pediu que os poderes "sigam uma lógica". Hoje:

- **Fogo vence gelo:** o fogo negro da Kage derrete a neve da Fada para sempre, e a Fada não neva sobre o fogo.
- **A Maré do Auric lava tudo** o que foi lançado (fogo, neve, aparições, selos, flechas), de qualquer dono, mas não o gelo do Inverno.
- **A Bruxa** não toca o chão: neve, gelo e fogo dos outros não a pegam.
- **O Susanoo** barra quase tudo, mas a armadilha escondida e o fogo negro de outro "atacam por dentro".
- **O Indomável do Bjorn** barra tudo e ainda desfaz o tempo invertido do Cronos.
- **O Guardião** perde as aparições se alguém passar por ele.
- **A Arqueira, a Fada, o Cavaleiro do Vazio, a Unidade Alva e o Anjo Caído** limpam armadilhas de jeitos diferentes (prender, nevar, destruir, explodir, o inferno engolir).
- Bloqueio de mira, nesta ordem: Indomável → Susanoo → Armadura Espectral → Égide Celestial.

## 11. Telas, câmera e som

- **Menu principal** (`/`): botões e o personagem escolhido no palco 3D com o cenário dele. Arrastar gira o personagem; clicar repete a intro.
- **Nova partida** (`/jogar`): modo (Treino ou Torneio do Poder), **mapa**, jogadores J1 a J4 (escolhe o assento e depois o personagem) e o modo teste "Habilidades carregadas". O palco do personagem fica grande ao lado.
- **Partida** (`/partida`): tela de carregamento que espera todos os modelos; HUD com lista de jogadores à esquerda (energia, cartas, carga), mão de cartas à direita, painel do dado, banners dos efeitos ("JACKPOT!", "BLOQUEADO!", "AZAR!"…), nomes flutuando sobre os bonecos ("J2 Coringa"), botão de tela cheia.
- **Escolher casas no tabuleiro** (selos, aparições, chamas, gelo): clicando direto nas casas, com cursor de mão encantada, marca na casa escolhida, Desfazer/Cancelar e confirmação.
- **Câmera:** três enquadramentos (Perto, Médio, Tabuleiro); arrastar move pelo tabuleiro, botão direito gira, roda dá zoom; "Meu personagem" volta a seguir. A câmera acompanha o jogador da vez, as flechas, a onda etc.
- **Configurações** (`/configuracoes`): som, música, qualidade dos efeitos.
- **Laboratório** (`/laboratorio`, só para desenvolvimento): testar efeitos visuais num personagem.
- **Som:** quase tudo é **sintetizado no navegador** (dado, passos, armadilhas, trovão, música gerada nota a nota, ambiente do mar). Falas gravadas dos personagens estão planejadas (testar o ElevenLabs).

## 12. Tecnologia e como os assets são feitos

- **Frontend:** Next.js + React + **React Three Fiber** (Three.js) para o 3D. As regras ficam em TypeScript puro (`frontend/src/game/`), separadas da tela, com mais de 290 testes automáticos.
- **Backend planejado:** FastAPI + WebSocket na AWS, escrito pelo autor (ele quer aprender FastAPI na prática). A interface já fala com o jogo por uma "porta" (`GameClient`) pensada para trocar o jogo local pelo servidor sem mudar a tela.
- **Personagens e objetos:** gerados no **Meshy AI** (texto ou imagem para 3D, com esqueleto e animações), comprimidos por scripts próprios. Personagens com asas são gerados **sem asas**, e as asas vêm como objeto separado batendo em código.
- **Cenários dos mapas:** kits gratuitos (CC0) da **KayKit** e da **Kenney**.
- **Efeitos:** feitos em código (shaders, partículas, brilho com bloom), sem luzes reais nos efeitos para não pesar. A biblioteca wawa-vfx já está em uso (partículas de cura da Erva Curativa).

## 13. O que falta e problemas em aberto

### Animações e modelos aguardados

- Clipe de "puxar e atirar" da Arqueira (fim de outubro).
- Animação da Kage Rubra (fim de outubro).
- Intro e cast para quem só tem idle e run: Encantadora, Guardião, Kage, Zéfiro, Têmis, Akane, Auric, Seraphiel (e Caído), Cronos e Unidade Alva.
- Clipe `showcase` (pose de vitrine no menu) para todos.
- Espada celestial e pouso de super-herói do Seraphiel.
- Relógio pendurado do Cronos; árvore redonda para a ilha; cristais naturais para o Bjorn.
- Vários modelos ficam com as **palmas das mãos para a frente** no idle (pose base ruim); o autor está regerando aos poucos.

### Problemas para resolver

- **Casa com 3 ou 4 personagens:** quando vários perdem a vez na mesma casa, os tronos não cabem na laje e se atravessam.
- **Seraphiel forte demais:** o autor vai mandar uma lista de ajustes.
- **Fome do Guardião:** a energia deve ir toda para o dono? Opções: manter (o que não cabe vira +1 de carga), cada ponto extra vira carga, ou guardar energia extra.
- **Inverno Eterno:** a onda de gelo pega primeiro quem está atrás (favorece o líder) — é intencional? O Bjorn deveria ter vantagem no gelo? Mostrar o progresso na tela ("❄ 7/12")?
- **Seraphiel:** ele deveria perder a Coroa Seráfica ao cair? (hoje ela vira infernal).
- Iluminação própria por mapa.

## 14. Ideias ainda não decididas

### Céu (está "sem graça")

- **Altar de Oferenda:** paga uma carta ou energia e escolhe 1 de 3 bênçãos.
- **Fonte dos Desejos:** escolhe 1 de 3 cartas.
- **Escada de Jacó:** sai do céu mais cedo, mas mais à frente.
- **Sino Celestial:** revela as armadilhas escondidas.
- **Juízo Divino:** o oponente marcado sofre a próxima armadilha em dobro.
- **Balança:** a recompensa cresce quanto mais atrás o jogador estiver.
- **Dado Dourado:** a próxima rolagem é 4 a 6.
- **Oráculo:** vê a rolagem e aceita ou rola de novo.
- **Nuvem:** pula para uma casa do céu à escolha.
- **Anjo da Guarda:** um companheiro absorve o próximo dano.

### Personagens

- **Alquimista** sem cartas para transmutar: usar cartas da mão **ou do descarte**; pagar 2 de energia como ingrediente; "Pedra Filosofal" (uma armadilha à frente vira bênção).
- **Coringa:** mais apostas e um seletor de 3 apostas aleatórias.
- **Necromante:** cartas subindo do chão em fogo verde-azulado.
- **Fada:** flocos de neve saindo da varinha até as armadilhas.
- **Zéfiro:** 4 habilidades elementais (rodízio ou escolha).
- **Falas de habilidade** para todos.
- **Coroas** na cabeça de cada personagem (hoje só os anjos).

### Visual

- Paredes e arcos dos corredores do céu e do inferno mais bonitos (os atuais são "quadrados").
- Mais vida nos mapas; usar os kits baixados.

## 15. Futuro do projeto

- **Deploy na Vercel** para os amigos jogarem.
- **Multiplayer online** (prioridade): salas via FastAPI + WebSocket. Cada jogador na sua tela, mãos e baralhos escondidos dos outros. Nas vezes dos outros a câmera acompanha quem joga.
- **Decks por personagem.**
- **Organizador:** coleção de cartas e montagem de baralho, com moedas, roletas e carta diária, compartilhado com um futuro projeto estilo Yu-Gi-Oh.
- Ideias antigas, não decididas: loja de personagens com moedas, cofre de personagens lendários desbloqueados em eventos, evolução de personagens, uma casa "arena" que abre um minijogo ou batalha, caminhos que se ramificam (o tabuleiro hoje é linear), bots, minimapa.
- Limite de **~20 personagens**, todos com animações completas, antes de crescer o elenco.

## 16. Decisões já tomadas (para quem for sugerir ideias)

Para não sugerir o contrário do que já foi decidido:

- Oponentes protegidos **continuam escolhíveis** como alvo; a carta ou habilidade é gasta com "BLOQUEADO".
- O céu só dá e o inferno só tira; os dois são corredores isolados do tabuleiro, um de cada por tabuleiro, e cada um sai pelo próprio portal.
- Bênçãos não valem nem gastam dentro do céu; bênçãos iguais se acumulam.
- Ser arrastado ao inferno custa tempo, não terreno (sai onde foi tirado).
- Neve da Fada e fogo da Kage só agem em quem **para**, não em quem passa.
- Não teleportar entre casas de neve (o autor recusou).
- Selos que trocam posições foram recusados por serem fortes demais.
- O jogo local é no mesmo computador **sem esconder a mão** (esconder só no online).
- Nada de referências diretas a franquias (Dragon Ball etc.) nos nomes.
- Cada personagem tem cenário e trono próprios, sem peças repetidas entre eles.
- As cartas fundidas são fortes de propósito.
