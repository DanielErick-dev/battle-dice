# Cartas exclusivas por personagem

Item do MVP: cada personagem soma **5 cartas próprias** ao baralho, no estilo da habilidade dele (decisão do Daniel em 01/11/2026: eram 4, passaram a 5). A 5ª pode ser um **Triunfo**: forte, cara, com custo extra.
**Feitas e testadas no código:** Têmis (5) e Zarek (4, falta a 5ª). Os outros personagens ainda são **proposta**, esperando a aprovação do Daniel antes de serem implementados.

## Regras gerais

- **Baralho:** o baralho comum continua igual (26 cartas com oponentes, 20 sozinho). As 5 exclusivas entram **1 cópia de cada**, embaralhadas junto, só no baralho de quem escolheu o personagem (31 cartas no total).
- **Jogando sozinho**, as exclusivas que miram oponentes ficam de fora, como as comuns.
- **Dono:** só quem tem a habilidade do personagem joga a carta. Se outro jogador pegar uma exclusiva (por exemplo, roubada pela Aposta do Coringa), ela fica **morta** na mão dele ("Carta de outro personagem"). Ainda serve como ingrediente da Transmutação ou para descartar.
- **Fora dos sorteios:** a Transmutação e o jackpot da Aposta nunca criam uma carta exclusiva.
- **Fusão:** como só existe 1 cópia de cada, as exclusivas não se fundem.
- **Custo e raridade:** seguem a tabela comum (Comum 1, Incomum 2, Rara 2, Épica 3, Lendária 4), salvo quando a carta define outro custo. Um Triunfo pode pedir também **cartas queimadas** da mão. O rodapé da carta mostra "Rara · Exclusiva".
- **Mira:** as exclusivas que miram seguem as regras de sempre. Um oponente protegido gasta a carta ("BLOQUEADO"). Se quem jogou já tem a Marca da Justiça e o **Veredito Silencioso** está armado, a carta vai para a Têmis e volta dobrada para quem a jogou.
- **Visual:** nenhuma carta pede asset novo do Meshy. Elas usam a arte procedural das cartas e os efeitos que já existem (empurrão, teletransporte, Vazio, balança do Veredito, desarme).

## Implementadas

### Têmis, a Juíza Vendada (Veredito Silencioso)

| Carta | Raridade · custo | Efeito | Interações |
|---|---|---|---|
| **Justiça Cega** | Comum · 1 | Todos andam **4** casas, um depois do outro, sem dado. A casa onde cada um parar tem efeito. | Começa por ela e segue a ordem dos turnos. Ninguém joga carta no meio. Os outros não ganham "jogue de novo" nem prompts (o Zarek não engole, o Seraphiel não escolhe). Se alguém cruzar a chegada assim, vence. |
| **Confisco de Bens** | Incomum · 2 | Mira: pega **2** cartas aleatórias da mão do oponente para a dela (menos, se ele tiver menos). | Exclusiva de outro personagem fica morta na mão dela. Oponente protegido: BLOQUEADO. |
| **Marca da Justiça** | Incomum · 2 | Todos os oponentes recebem **1** Marca da Justiça. | Prepara o Veredito: o próximo ataque mirado de qualquer um deles já pode ser redirecionado. |
| **Decreto de Contenção** | Rara · 3 | Nas próximas **3** rolagens de cada oponente, o dado não passa de **3**. | 4–6 viram 1–3 (cada face continua igualmente provável). Runa do Destino vale no máximo 3. Bônus de cartas, asas e coroa somam por cima. |
| **Julgamento Final** (Triunfo) | Épica · 5 + queimar 1 carta | Mira um oponente: ela anda (distância ÷ **3**, para cima) × um **Dado da Justiça** (1–6). O alvo fica parado. | Não é ataque: nada bloqueia nem marca. Vale com o alvo à frente ou atrás. Sem teto (decisão do Daniel); se ficar forte demais, a ideia é pedir 2 cartas queimadas. |

### Zarek, o Cavaleiro do Vazio (o Vazio)

| Carta | Raridade · custo | Efeito | Interações |
|---|---|---|---|
| **Fome do Vazio** | Incomum · 2 | O Vazio ganha **+2** de carga. | Não pode ser jogada com a habilidade já pronta. |
| **Fenda Faminta** | Rara · 2 | O Vazio engole a primeira armadilha, maldição ou "perde a vez" **visível** nas próximas **15** casas, **sem gastar a carga**. | Pula casas cobertas (neve, gelo, fogo negro, presas por flecha, já destruídas). Armadilhas escondidas continuam secretas. Bloqueada com o Vazio cheio ou sem nada à vista. |
| **Eco do Vazio** | Épica · 3 | A última coisa guardada no Vazio vira duas. | Bloqueada com o Vazio vazio ou cheio (4). |
| **Chamado da Fenda** | Épica · 3 | Mira: puxa um oponente de volta até a fenda do Zarek mais próxima **atrás dele**, e ela o atinge. | Só aparecem como alvo os oponentes com uma fenda dele atrás. Escudo Arcano, Auréola etc. protegem normalmente. Contra a Têmis armada, a carta só é **anulada** (as fendas nunca ferem o Zarek). |

## Propostas (aguardando aprovação)

Ideias para discutir e cortar. Os números são ponto de partida.

### Encantadora Carmesim (Conjuração Dupla)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Sangue por Mana | Comum · 1 | +3 de energia, mas você volta 2 casas. |
| Lâmina de Sangue | Incomum · 2 | Mira: empurra 4 casas, ou 8 se for a segunda carta do turno (Conjuração Dupla). |
| Eco Carmesim | Rara · 2 | A última carta do seu descarte volta para a mão. |
| Ritual Carmesim | Épica · 3 | +2 de carga na habilidade e compre 1 carta. |

### Bruxa Carmesim (Levitação)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Vassoura | Comum · 1 | Avance 2 casas flutuando: a casa onde parar não tem efeito. |
| Caldeirão | Incomum · 2 | Compre 1 carta e ganhe 1 de energia. |
| Maldição da Bruxa | Rara · 2 | Mira: o oponente perde os bônus e a carta de lançamento que esperavam a rolagem. |
| Voo Noturno | Épica · 3 | Levitação por 1 vez, sem gastar a habilidade. |

### Alquimista Esmeralda (Transmutação)
Resolve a queixa de "não ter carta para transmutar".
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Reagente | Comum · 1 | Compre 1 carta (um ingrediente). |
| Frasco Instável | Incomum · 2 | Mira: o oponente perde 2 de energia e você ganha 1. |
| Destilação | Rara · 2 | Transmute 1 carta da mão sem sacrificar outra (sobe 1 nível). |
| Pedra Filosofal | Épica · 3 | A próxima armadilha visível à frente vira uma casa de energia, para sempre. |

### Monge Ancião (Fúria Adormecida)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Meditação | Comum · 1 | +1 de carga na habilidade e +1 de energia. |
| Foco Interior | Incomum · 2 | Bônus: +2 na próxima rolagem (com a Fúria ativa, o ×3 multiplica o bônus junto). |
| Palma Serena | Rara · 2 | Mira: o oponente perde os bônus de dado acumulados. |
| Calma Absoluta | Épica · 3 | Cancela as vezes perdidas e ganha +3 de energia. |

### Arqueira Élfica (Chuva de Flechas)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Flecha Presa | Comum · 1 | Prende a próxima armadilha visível à frente (como a Chuva de Flechas, só uma). |
| Flecha Certeira | Incomum · 2 | Mira: empurra 5 casas, ou 8 se o oponente estiver 10+ casas à frente. |
| Olho de Águia | Rara · 2 | Lançamento: role 3 dados e fique com o maior. |
| Flecha Envenenada | Épica · 3 | Mira: o oponente perde 3 de energia. |

### Coringa Carmesim (Aposta)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Carta Marcada | Comum · 1 | Olhe as 3 primeiras do baralho e fique com 1. |
| Cara ou Coroa | Incomum · 2 | Role um dado: 4+ compre 2 cartas; 1 a 3 descarte 1. |
| Roleta | Rara · 2 | Mira: troque uma carta aleatória sua por uma aleatória do oponente. |
| All-in | Épica · 3 | Role um dado: 4+ a sua energia dobra (máx. 10); 1 a 3 ela zera. |

### Necromante (Ressurreição)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Ossos do Chão | Comum · 1 | Uma carta do descarte volta para o topo do baralho. |
| Pacto Sombrio | Incomum · 2 | +1 de carga na habilidade e +1 de energia. |
| Toque da Morte | Rara · 2 | Mira: o oponente descarta a carta mais cara da mão. |
| Exército de Ossos | Épica · 3 | Bônus: +1 na próxima rolagem para cada carta no seu descarte (máx. +5). |

### Escriba da Carne (Selos Proibidos)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Assinatura | Comum · 1 | Escreve 1 selo do Dízimo numa casa a até 10 de você. |
| Rasura | Incomum · 2 | Troca o tipo de um selo seu já escrito. |
| Contrato | Rara · 2 | Mira: você e o oponente trocam 1 carta aleatória. |
| Palavra Proibida | Épica · 3 | Mira: o oponente fica silenciado (sem cartas) na próxima vez. |

### Guardião das Sombras (Aparições)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Passo Sombrio | Comum · 1 | Avance até a próxima aparição sua à frente (até 8 casas), sem efeito na chegada. |
| Sussurro | Incomum · 2 | Mira: o oponente descarta 1 carta e você compra 1. |
| Véu | Rara · 2 | Armadura Espectral por 1 vez. |
| Legião | Épica · 3 | Coloca 1 aparição da Fome numa casa a até 10 de você. |

### Kage Rubra (Despertar Ocular)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Kunai | Comum · 1 | Mira: empurra 3 casas. |
| Bomba de Fumaça | Incomum · 2 | Armadura Espectral por 1 vez. |
| Chama Negra | Rara · 2 | Acende fogo negro numa casa à frente (até 8), por 5 rodadas. |
| Amaterasu Concentrado | Épica · 3 | Todas as suas chamas acesas ganham +3 rodadas. |

### Fada Cristalina (Florescer da Fada)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Floco | Comum · 1 | Encanta (neve dela) a próxima casa nociva à frente, até 6 casas. |
| Brisa Gelada | Incomum · 2 | Mira: o oponente perde 2 de energia, que vão para ela. |
| Pó de Fada | Rara · 2 | Avance até a próxima neve sua à frente (até 10 casas). |
| Coração de Gelo | Épica · 3 | No Inverno Eterno: o gelo avança +3 casas. Fora dele: +2 de carga. |

### Zéfiro (Vento a Favor)
Pode mudar quando ele ganhar as 4 habilidades dos elementos.
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Rajada a Favor | Comum · 1 | Bônus: +2 na próxima rolagem. |
| Sopro | Incomum · 2 | Mira: empurra 4 casas. |
| Redemoinho | Rara · 2 | Mira: troca de lugar com um oponente a até 3 casas de você. |
| Furacão | Épica · 3 | Todos os oponentes no seu alcance voltam 3 casas. |

### Akane (Sessão de Estudo)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Cola | Comum · 1 | Compre 1 carta. |
| Revisão | Incomum · 2 | A última carta do seu descarte volta para a mão. |
| Prova Surpresa | Rara · 2 | Mira: o oponente descarta 1 carta aleatória para cada carta a mais que ele tem do que você. |
| Nota Máxima | Épica · 3 | Compre até ficar com 6 cartas na mão. |

### Bjorn Presa-Gélida (Indomável)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Investida | Comum · 1 | Avance 2 casas atropelando quem estiver no caminho. |
| Pele de Gelo | Incomum · 2 | Ganha o Escudo Arcano. |
| Fúria do Norte | Rara · 2 | Lançamento: 2 dados somados; os atropelos desta rolagem empurram +3. |
| Rugido | Épica · 3 | Mira: o oponente perde a próxima vez se estiver a até 3 casas dele. |

### Auric (Maré Purificadora)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Maré Baixa | Comum · 1 | Limpa os feitiços da próxima casa à frente. |
| Ouro Líquido | Incomum · 2 | +3 de energia. |
| Onda | Rara · 2 | Mira: empurra 5 casas. |
| Tesouro Afundado | Épica · 3 | Compre 2 cartas e ganhe +2 de energia. |

### Seraphiel (Bênção Seráfica → Arrastar ao Inferno depois da Queda)
**Decidido pelo Daniel (29/10):** o Seraphiel tem **dois jogos de 4 cartas**.
- Começa com as **4 angelicais** no baralho.
- Quando cai no inferno e vira Anjo Caído, as angelicais são **jogadas fora automaticamente**: saem da mão, do baralho e do descarte. As **4 caídas** entram embaralhadas no baralho dele.
- A Queda é para sempre, então as angelicais nunca voltam.

**Angelicais** (proposta)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Pena Sagrada | Comum · 1 | +1 na próxima rolagem e +1 de energia. |
| Luz Purificadora | Incomum · 2 | Cancela as vezes perdidas e as correntes. |
| Juízo Celestial | Rara · 2 | Mira: empurra 5 casas. |
| Coro Angelical | Épica · 3 | Recebe uma bênção do céu aleatória. |

**Caídas** (proposta)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Pena Negra | Comum · 1 | Mira: o oponente perde 1 de energia e você ganha 1. |
| Corrente do Abismo | Incomum · 2 | Mira: o oponente fica acorrentado (não usa cartas de lançamento) na próxima vez. |
| Asa Quebrada | Rara · 2 | Mira: o oponente desce até o portal infernal mais próximo atrás dele (se houver). |
| Coroa de Cinzas | Épica · 3 | Uma maldição do inferno aleatória cai num oponente à sua escolha. |

### Cronos (Distorção Temporal)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Tique-Taque | Comum · 1 | +1 de carga na habilidade. |
| Pausa | Incomum · 2 | Mira: o oponente perde os bônus e a carta de lançamento que esperavam a rolagem. |
| Atraso | Rara · 2 | Mira: a próxima rolagem do oponente anda de ré. |
| Dobra do Tempo | Lendária · 4 | Você joga de novo depois desta vez. |

### Unidade Alva (Canhão de Plasma)
| Carta | Raridade · custo | Efeito |
|---|---|---|
| Mira Laser | Comum · 1 | Mira: empurra 2 casas. |
| Escudo de Plasma | Incomum · 2 | Ganha o Escudo Arcano. |
| Míssil | Rara · 2 | Destrói a próxima armadilha visível à frente (até 10 casas). |
| Sobrecarga | Épica · 3 | +3 de carga na habilidade, mas perde 2 de energia. |

## Próximos passos (Daniel, 29/10)

1. **Repensar as 4 cartas de cada personagem**, uma por uma, junto com o Daniel. As propostas acima são só ponto de partida e várias se repetem ("empurra X casas", "+carga"). A ideia é que cada carta só faça sentido naquele personagem.
2. **Design visual das cartas:** hoje a arte é desenhada em código (SVG em `CardArt.tsx`). As cartas precisam de um visual bem trabalhado: moldura por raridade, arte de cada carta e marca de exclusiva com a cor do personagem. Definir o estilo (ilustração gerada, render 3D do Meshy ou outra coisa) antes de produzir as artes.

## Pontos em aberto

- **Seraphiel:** decidido, são dois jogos (angelical e caído), veja acima. No código, a carta caída pertence à habilidade `hellsDrag` e a troca acontece no `fallIfInHell`.
- **Repetições:** várias propostas repetem "empurra X casas" ou "+carga". Vale trocar algumas por algo mais único antes de implementar.
- **Equilíbrio:** a Balança da Justiça e o Eco do Vazio são as mais fortes das já feitas. Observar nos testes.
