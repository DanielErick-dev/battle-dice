import type { CharacterId } from "./index";

/** The Characters screen's write-up for each one: how they play, in a line, and a few tips (pt-BR). */
export interface CharacterGuide {
  /** Their play style in a few words (a tag under the name). */
  role: string;
  /** How they win, in a sentence or two. */
  style: string;
  tips: readonly string[];
}

export const CHARACTER_GUIDES: Readonly<Record<CharacterId, CharacterGuide>> = {
  zarek: {
    role: "Controle · armadilhas",
    style:
      "Transforma o perigo do tabuleiro em arma: engole armadilhas que o atingiriam e as solta de volta no caminho dos outros.",
    tips: [
      "Guarde armadilhas no Vazio e solte logo à frente de quem está liderando.",
      "As fendas que você abre nunca te atingem: ande por cima delas sem medo.",
      "Parado por um tempo, o Vazio pode tomar o feitiço de outro personagem no tabuleiro.",
    ],
  },
  enchantress: {
    role: "Cartas · ritmo",
    style: "Joga duas cartas no mesmo turno e transforma uma mão boa numa jogada decisiva.",
    tips: [
      "Junte cartas que combinam (bônus de dado + lançamento) para usar tudo de uma vez.",
      "Segure a habilidade para o turno em que tiver energia para duas cartas.",
    ],
  },
  witch: {
    role: "Evasão · segurança",
    style: "Flutua por cima do tabuleiro: armadilhas, maldições e neve não a tocam enquanto levita.",
    tips: [
      "Ative a Levitação antes de trechos cheios de armadilhas.",
      "Mesmo sem levitar, a neve, o gelo e o fogo negro dos outros não a prendem.",
      "Cuidado: flutuando você também ignora bênçãos e portais bons.",
    ],
  },
  alchemist: {
    role: "Controle · reciclagem",
    style:
      "Vira o tabuleiro do avesso: as casas ruins a empurram para a frente e as boas ferem os oponentes. Recicla cartas do cemitério.",
    tips: [
      "Ligue a Grande Inversão quando os oponentes estiverem perto de casas boas: avanço vira recuo, jogar de novo vira perde a vez.",
      "Com a inversão ligada, procure as armadilhas e o perde a vez: para você, viram avanço e jogadas extras.",
      "Toda carta que vai para qualquer cemitério enche o Condensador: a cada 4, uma das suas volta para a mão.",
      "Troca Equivalente Estrita só funciona com você numa casa ruim: pare numa armadilha de propósito e troque com o líder.",
    ],
  },
  monk: {
    role: "Corrida · explosão",
    style: "Uma rolagem triplicada que atravessa o tabuleiro como um raio.",
    tips: [
      "Combine a Fúria Adormecida com cartas de bônus: o bônus também triplica.",
      "Use quando um trecho limpo de armadilhas estiver à frente.",
    ],
  },
  archer: {
    role: "Ataque · limpeza",
    style: "Uma chuva de flechas que empurra todos os oponentes para trás ou prende as armadilhas à frente.",
    tips: [
      "Mire nos oponentes quando todos estiverem perto de você.",
      "Prender armadilhas abre caminho para você e atrapalha quem vem atrás quando você passa.",
    ],
  },
  jester: {
    role: "Sorte · roubo",
    style: "Aposta com o dado da sorte para roubar as cartas dos outros.",
    tips: [
      "Mire em quem está com a mão cheia: o prêmio é maior.",
      "O risco existe: num número baixo você é quem entrega uma carta.",
    ],
  },
  necromancer: {
    role: "Cartas · reaproveitamento",
    style: "Traz de volta as melhores cartas que já jogou.",
    tips: [
      "Jogue suas melhores cartas cedo: a Ressurreição as devolve depois.",
      "As cartas ressuscitadas viram pó ao sair da mão de novo: use-as bem.",
    ],
  },
  scribe: {
    role: "Armadilhas · blefe",
    style: "Espalha selos que parecem iguais para os outros, cada um com uma punição diferente.",
    tips: [
      "Escreva os selos nas casas por onde os oponentes vão passar logo.",
      "Os outros não sabem qual selo é qual: o medo também atrapalha.",
    ],
  },
  warden: {
    role: "Armadilhas · roubo",
    style: "Invoca aparições que roubam cartas e energia de quem passa por elas.",
    tips: [
      "Para os outros as aparições parecem você mesmo: eles não sabem qual é qual.",
      "Quem passar por você desfaz as aparições: fique longe da frente da trilha.",
    ],
  },
  kage: {
    role: "Ataque · defesa",
    style: "Escolhe entre fogo negro em casas do caminho ou a armadura do Susanoo.",
    tips: [
      "Ponha o fogo negro nas casas onde os oponentes costumam parar.",
      "Guarde o Susanoo para quando alguém for mirar em você.",
    ],
  },
  fairy: {
    role: "Mobilidade · controle",
    style: "Transforma as armadilhas à frente em neve encantada, que a leva para longe e prende os outros.",
    tips: [
      "Parar na sua neve te adianta; os outros ficam presos nela.",
      "No fim da partida, o Inverno Eterno congela o tabuleiro aos poucos.",
    ],
  },
  zephyr: {
    role: "Elementos · versatilidade",
    style:
      "Dobra um elemento a cada uso (terra, água, fogo ou vento) e, ao juntar os quatro na órbita, entra na Convergência: intocável, com +3 no dado e a habilidade pronta de novo.",
    tips: [
      "Varie os elementos: cada um novo enche a órbita, e repetir o último é proibido.",
      "Ponha a muralha logo à frente de quem lidera: cada rolagem dele bate nela.",
      "O laço de água funciona melhor em quem rola alto: você anda metade do que ele andar.",
      "O vento é escondido: arme e espere um oponente tirar 6.",
      "As cartas dele também contam elementos: a Convergência dos Quatro completa a órbita de uma vez.",
    ],
  },
  themis: {
    role: "Defesa · punição",
    style: "O Veredito se arma em segredo e devolve dobrado o próximo ataque mirado nela.",
    tips: [
      "Ninguém vê a sua carga: deixe que pensem que você está desprotegida.",
      "As Marcas da Justiça também julgam quem ataca os outros.",
    ],
  },
  akane: {
    role: "Ataque · pressão",
    style: "Incendeia o caminho à frente: quem queima anda metade e paga energia para ele.",
    tips: [
      "Ative a Zona de Incêndio quando os oponentes estiverem logo à sua frente.",
      "Dados baixos e armadilhas acendem a Chama Interna: com 3, vem o Ímpeto Brilhante.",
    ],
  },
  bjorn: {
    role: "Corrida · força bruta",
    style: "Atropela quem estiver no caminho e, Indomável, nada o atinge por alguns turnos.",
    tips: [
      "Passar por cima dos oponentes os empurra para trás de graça.",
      "Ative o Indomável antes de trechos perigosos ou quando todos estiverem mirando em você.",
    ],
  },
  auric: {
    role: "Suporte · limpeza",
    style: "Uma onda que varre do caminho à frente os feitiços de todo mundo.",
    tips: [
      "Use a Maré quando o caminho estiver cheio de fogo, neve, selos ou aparições.",
      "A onda também apaga quem está pegando fogo.",
    ],
  },
  seraphiel: {
    role: "Bênçãos · céu",
    style: "Recebe presentes do céu e é mais forte lá; se pisar no inferno, cai para sempre.",
    tips: [
      "No céu você escolhe a bênção e a relíquia de cada casa.",
      "Saindo do céu, ganha a Coroa: +1 em todas as rolagens.",
      "Fuja dos portais do inferno, a não ser que queira virar o Anjo Caído.",
    ],
  },
  cronos: {
    role: "Controle · tempo",
    style: "Para ou inverte o tempo de um oponente por algumas rodadas.",
    tips: [
      "Pare o tempo do líder quando ele estiver perto da chegada.",
      "Inverter é melhor em quem está em cima de casas boas.",
    ],
  },
  alva: {
    role: "Controle · cartas",
    style: "Infecta as mãos com Cartas Corrompidas, espiona e queima quem acumula cartas.",
    tips: [
      "Injete Corrompidas perto da Sobrecarga: elas fazem a mão passar de 5.",
      "Use o PEM quando os oponentes estiverem com a mão cheia de cartas boas.",
      "O Colapso pesa mais em quem está com muitas cartas, Corrompidas incluídas.",
    ],
  },
  vinicius: {
    role: "Passivo · tranquilo",
    style: "Com a enxada, arranca qualquer armadilha em que para. Sem botão, sem pressa.",
    tips: ["Não precisa fazer nada: a Capina age sozinha.", "Armadilhas no seu caminho viram terra limpa."],
  },
};
