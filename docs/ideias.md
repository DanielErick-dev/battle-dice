# Banco de ideias

Ideias que ainda não viraram decisão. Quando uma for aprovada, mova para o plano ou para a ficha do personagem.
Marque a origem quando vier de fora (ex.: *Gemini*).

## Céu (o reino está "sem graça")
Hoje há só 4 bênçãos fixas e 3 relíquias, sem decisões. Candidatas:
- **Altar de Oferenda:** paga uma carta ou energia e escolhe 1 de 3 bênçãos.
- **Fonte dos Desejos:** escolhe 1 de 3 cartas.
- **Escada de Jacó:** sai do céu mais cedo, mas mais à frente.
- **Sino Celestial:** revela as armadilhas escondidas.
- **Juízo Divino:** o oponente marcado sofre a próxima armadilha em dobro.
- **Balança:** a recompensa cresce quanto mais atrás o jogador estiver.
- **Dado Dourado:** a próxima rolagem é 4–6.
- **Oráculo:** vê a rolagem e aceita ou rola de novo.
- **Nuvem:** pula para uma casa do céu à escolha.
- **Anjo da Guarda:** um companheiro absorve o próximo dano.

## Personagens
- **Alquimista:** muitas vezes não tem carta para transmutar. Opções: ingredientes da mão OU do descarte; 2 de energia como ingrediente; "Pedra Filosofal" (uma armadilha à frente vira bênção).
- **Coringa:** mais apostas e o seletor de 3 apostas aleatórias (hoje só existe o Roubo de Cartas).
- **Necromante:** na Ressurreição, as cartas sobem do chão em fogo verde-azulado.
- **Fada / Inverno Eterno:**
  - O Bjorn ganha vantagem no gelo?
  - A onda de gelo pega primeiro quem está atrás (favorece o líder). Isso é intencional?
  - Mostrar o progresso na interface ("❄ 7/12").
- **Seraphiel:** perde a Coroa Seráfica se cair de outro jeito? (hoje a Queda sempre dá a coroa infernal).
- **Fada:** flocos de neve saindo do cetro até as armadilhas (falta o clipe de cast "mão para frente").
- **Zéfiro (quatro elementos):** trocar o Vento a Favor por **4 habilidades, uma por elemento** (água, fogo, terra e ar), ainda sem efeitos definidos. Na intro ele "dobra" os quatro elementos em sequência, como nos desenhos (estilo Avatar). Duas formas em aberto: **rodízio** (água → fogo → terra → ar, menos apelão) ou **escolher** o elemento na hora (mais liberdade). O trono dele (`elementalThrone`) já está no jogo.
- **Falas de habilidade** para todos (ex.: Kage gritando "Amaterasu"). Testar o ElevenLabs. Arquivos em `public/audio/voices/`.
- **Coroas na cabeça:** por enquanto só os anjos usam coroa.

## Visual
- Paredes e arcos dos corredores do céu e do inferno gerados no Meshy/Tripo (as atuais estão "quadradas").
- Uma cadeira por personagem (a fada, o Seraphiel e o Anjo Caído já têm a sua).
- **Tabuleiro como mapa:** trocar o tabuleiro quadrado por uma paisagem (estilo mapa), para não ficar um tabuleiro no meio do nada. Depois de terminar as cadeiras e os elementos dos habitats.

- **Tom do jogo mais sombrio (Daniel, 2026-10-29):** o mapa e a sombra do Vazio estão com cara "fofa/infantil". O Vazio vagando parece uma sombrinha fofa; deveria ser algo escuro e ameaçador (trocar por um modelo do Meshy, sem forma feita em código). O mapa em geral também deveria ser mais escuro e sombrio. **Mapa: feito em 2026-10-29** (noite nublada e fria, cores escuras, sem figurantes, navios, golfinhos, pássaros, bandeiras, flores, cogumelos e plantações). **Falta:** o modelo do Vazio.

## Problemas para resolver
- **Casa pequena com 3 ou 4 personagens:** quando vários param na mesma casa de "perde a vez", todos sentam no próprio trono e os tronos não cabem na laje (um atravessa o outro). Na largada já foi resolvido com uma praça maior; nas outras casas ainda falta decidir. Ideias: tronos menores quando a casa está cheia, só o primeiro senta no trono e os outros no chão, ou os personagens saem para a beira da estrada ao lado da casa.

## Modos e longo prazo
- **Hot-seat local** de 3–4 jogadores (a engine já aceita N jogadores; falta a interface).
- **Multiplayer online** (prioridade): backend FastAPI + WebSocket na AWS, escrito pelo Daniel.
- **Organizador:** coleção de cartas e deck builder com moedas, roletas e carta diária, compartilhado com o projeto Yu-Gi-Oh. Ele alimenta os `decks` do `createGame`.
- **Decks por personagem.**
- **Visão do projeto:** "Yu-Gi-Oh com RPG e tabuleiro".

## Pós-MVP (pedidos de 2026-10-26)
- **Mais perto do Yu-Gi-Oh** no estilo de jogo.
- **Até 8 jogadores** por partida.
- **Ampulheta de 1 minuto por jogada:**
  - só desce enquanto **nada está acontecendo** (o jogador pensando). Para durante rolagens, movimentos e ativações de cartas;
  - passou de 1 minuto, o jogador **perde a vez automaticamente**;
  - cada jogador pode **pausar a partida 2 a 3 vezes** no máximo.
- **Cartas armadilha** (estilo Yu-Gi-Oh):
  - colocadas **viradas para baixo**; só quem jogou sabe qual é, o oponente vê que existe uma carta mas não o que ela faz;
  - ficam num **slot de armadilhas dentro do próprio mapa**, um por jogador, ao lado de onde as cartas dele são exibidas (separado da mão), com **limite próprio**;
  - exemplo: **Efeito Reverso**, o que o oponente tacar em você volta contra ele;
  - começar com poucas cartas armadilha.
- **Cartas mágicas** viradas para cima (depois das cartas armadilha).
- **Invocação de monstros.**
