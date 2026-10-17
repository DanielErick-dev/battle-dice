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
- **Falas de habilidade** para todos (ex.: Kage gritando "Amaterasu"). Testar o ElevenLabs. Arquivos em `public/audio/voices/`.
- **Coroas por personagem** na cabeça.

## Visual
- Paredes e arcos dos corredores do céu e do inferno gerados no Meshy/Tripo (as atuais estão "quadradas").
- Uma cadeira por personagem (a fada, o Seraphiel e o Anjo Caído já têm a sua).

## Modos e longo prazo
- **Hot-seat local** de 3–4 jogadores (a engine já aceita N jogadores; falta a interface).
- **Multiplayer online** (prioridade): backend FastAPI + WebSocket na AWS, escrito pelo Daniel.
- **Organizador:** coleção de cartas e deck builder com moedas, roletas e carta diária, compartilhado com o projeto Yu-Gi-Oh. Ele alimenta os `decks` do `createGame`.
- **Decks por personagem.**
- **Visão do projeto:** "Yu-Gi-Oh com RPG e tabuleiro".
