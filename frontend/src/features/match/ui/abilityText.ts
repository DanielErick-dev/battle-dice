import { abilityCycle } from "@/game/domain/abilities/charge";
import { TRANSMUTATION_CARDS, TRANSMUTATION_FALLBACK_LEVEL } from "@/game/domain/characters/alchemist/transmutation";
import { ARROW_RAIN_PINS, ARROW_RAIN_PUSH } from "@/game/domain/characters/archer/arrowRain";
import { BLOOD_PACT_ENERGY, RUIN_PUSH, SEAL_RANGE } from "@/game/domain/characters/scribe/seals";
import { CARD_GAMBLE_DRAWS, CARD_GAMBLE_EPICS, CARD_GAMBLE_JACKPOT, CARD_GAMBLE_LOSES_UP_TO, CARD_GAMBLE_LOST, CARD_GAMBLE_STOLEN } from "@/game/domain/characters/jester/cardGamble";
import { DORMANT_FURY_MULTIPLIER, STUDY_DRAWS, TAILWIND_BONUS, LEVITATION_TURNS } from "@/game/domain/abilities/basic";
import { PLASMA_PUSH, PLASMA_TRAPS } from "@/game/domain/characters/alva/plasmaCannon";
import { TIDE_RANGE } from "@/game/domain/characters/auric/cleansingTide";
import { TRAMPLE_PUSH, UNTAMED_TURNS } from "@/game/domain/characters/bjorn/untamed";
import { TIME_ROUNDS } from "@/game/domain/characters/cronos/timeWarp";
import { RESURRECTION_CARDS } from "@/game/domain/characters/necromancer/resurrection";
import { PLUNDER_CARDS, SPECTER_RANGE } from "@/game/domain/characters/warden/specters";
import type { AbilityId } from "@/game/domain/abilities/ability";
import { ARMOUR_TURNS, FLAME_ENERGY, FLAME_HITS, FLAME_PUSH, FLAME_TILES, FLAME_TURNS } from "@/game/domain/characters/kage/flames";
import { VOID_CAPACITY, VOID_DOUBLE_ENERGY, VOID_IDLE_ROUNDS } from "@/game/domain/characters/zarek/void";
import { ENCHANT_ADVANCE, ENCHANT_FREEZE, SNOW_DRAIN, ENCHANT_TILES, WINTER_PICKS, WINTER_TILES } from "@/game/domain/characters/fairy/winter";
import { MAX_RARITY_LEVEL } from "@/game/domain/cards/catalog";
import { BLESSING_TURNS, SERAPH_BLESSING_TURNS } from "@/game/domain/board/blessings";
import { CROWN_BONUS, DRAG_TRAPS } from "@/game/domain/characters/seraphiel/seraph";
import { BLIND_SCALE_ENERGY } from "@/game/domain/characters/themis/verdict";

/**
 * Player-facing ability copy (pt-BR). Rules live in the domain; this is only what the ability
 * says: `description` on pickers, `active` once it's used.
 */
export const ABILITY_TEXT: Readonly<Record<AbilityId, { name: string; description: string; active: string }>> = {
  doubleCast: {
    name: "Conjuração Dupla",
    description: `Carrega em ${abilityCycle("doubleCast")} turnos. Ao usar, você pode jogar 2 cartas no turno.`,
    active: "Use até 2 cartas neste turno",
  },
  theVoid: {
    name: "O Vazio",
    description: `Carrega em ${abilityCycle("theVoid")} turnos, e +1 a cada armadilha em que alguém cai ou que é destruída ou presa. Pronto, ao cair numa armadilha, maldição ou perde a vez, você escolhe se o Vazio a engole: ela some da casa e fica guardada (até ${VOID_CAPACITY}). Na sua vez, solte o que guardou: uma armadilha abre uma casa nova no caminho, logo depois da casa que você escolher, e pode ter a penalidade dobrada por ${VOID_DOUBLE_ENERGY} de energia. As suas fendas não te atingem. Depois de ${VOID_IDLE_ROUNDS} rodadas sem o Vazio agir, ele pode tomar fogo, neve, gelo, selo ou aparição de uma casa, que passa a ser seu ao soltar.`,
    active: "O Vazio agiu",
  },
  tailwind: {
    name: "Vento a Favor",
    description: `Carrega em ${abilityCycle("tailwind")} turnos. Ao usar, a rolagem do turno anda +${TAILWIND_BONUS} casas.`,
    active: `+${TAILWIND_BONUS} casas na rolagem deste turno`,
  },
  studySession: {
    name: "Revisão Relâmpago",
    description: `Carrega em ${abilityCycle("studySession")} turnos. Ao usar, compra ${STUDY_DRAWS} cartas na hora.`,
    active: `+${STUDY_DRAWS} cartas na mão`,
  },
  seraphBlessing: {
    name: "Bênção do Serafim",
    description: `Carrega em ${abilityCycle("seraphBlessing")} turnos. Ao usar, recebe um presente do céu aleatório: uma bênção (Asas, Auréola, Inspiração ou Fonte de Luz) ou uma carta do céu na mão (Luz Celestial, Égide Celestial ou Ascensão). Passivas: suas bênçãos duram ${SERAPH_BLESSING_TURNS} rodadas (as dos outros, ${BLESSING_TURNS}); no céu, você escolhe a bênção e a relíquia de cada casa; ao sair do céu ganha a Coroa Seráfica (+${CROWN_BONUS} casa em toda rolagem até o fim). Cuidado: se pisar no inferno, cai para sempre e vira o Anjo Caído.`,
    active: "Uma bênção desce do céu",
  },
  hellsDrag: {
    name: "Arrastar ao Inferno",
    description: `Carrega em ${abilityCycle("hellsDrag")} turnos. Ao usar, escolha um oponente: uma mão do inferno o agarra e o leva direto para o começo do inferno (quem está no céu ou no inferno escapa). Se ele estiver Indomável ou com armadura, a mão é repelida e a habilidade é gasta à toa. Sozinho, o inferno engole as próximas ${DRAG_TRAPS} armadilhas à frente. Passivas do Anjo Caído: o inferno não te fere, o céu está fechado para você e a Coroa Infernal dá +${CROWN_BONUS} casa em toda rolagem.`,
    active: "O inferno cobra a sua parte",
  },
  cleansingTide: {
    name: "Maré Purificadora",
    description: `Carrega em ${abilityCycle("cleansingTide")} turnos. Ao usar, uma onda varre a sua casa e as ${TIDE_RANGE} casas à frente: fogo negro, neve, aparições, selos e flechas que prendem armadilhas somem, de quem quer que sejam.`,
    active: "A maré lavou o caminho",
  },
  untamed: {
    name: "Indomável",
    description: `Passiva: todo oponente que você atravessa ou em quem para, com o dado ou cartas de movimento, volta ${TRAMPLE_PUSH} casas na hora. Carrega em ${abilityCycle("untamed")} turnos. Ao usar, por ${UNTAMED_TURNS} turnos nada te atinge: armadilhas, maldições, perder a vez, neve, fogo, selos, aparições e o que os outros mirarem em você. Bênçãos continuam valendo, e se o tempo do seu dado estiver invertido ele volta a andar para a frente. A carga só volta a contar quando acaba (uma casa de habilidade ainda carrega).`,
    active: `Nada te detém por ${UNTAMED_TURNS} turnos`,
  },
  silentVerdict: {
    name: "Veredito Silencioso",
    description: `Carrega em ${abilityCycle("silentVerdict")} turnos e se arma sozinho, em segredo: os oponentes não veem a sua carga. Armado, a próxima carta ou habilidade que um oponente mirar em você (Rajada Arcana, Clarão Ofuscante, Chamado do Abismo, Troca de Destinos, Distorção Temporal, Arrastar ao Inferno ou o roubo da Aposta) é anulada e se volta contra ele: quem ia te empurrar recua, quem ia te cegar perde a vez, quem ia te arrastar ao inferno desce no seu lugar, quem ia te roubar perde as cartas para você (a Troca só é anulada). Desarmado, você sofre tudo normalmente. Passiva, a Balança Cega: armadilhas escondidas no seu caminho são desarmadas e cada uma dá +${BLIND_SCALE_ENERGY} de energia.`,
    active: "O veredito foi dado",
  },
  timeWarp: {
    name: "Engrenagem do Tempo",
    description: `Carrega em ${abilityCycle("timeWarp")} turnos. Ao usar, escolha um oponente e o que fazer com o tempo dele: Parar (fica ${TIME_ROUNDS} rodadas sem jogar) ou Inverter (nas próximas ${TIME_ROUNDS} rodadas o dado dele anda para trás). Soma com o que ele já tinha. Só alcança quem está no mesmo lugar que você (o tabuleiro, o céu ou o inferno). Se o alvo estiver Indomável, no Susanoo, com armadura ou sob a Égide Celestial, o tempo é bloqueado e a habilidade é gasta à toa. A carga só volta a contar depois que essas ${TIME_ROUNDS} rodadas passam (uma casa de habilidade ainda carrega). Sem ninguém ao alcance, você joga de novo depois deste turno.`,
    active: "O tempo obedece",
  },
  plasmaCannon: {
    name: "Canhão de Plasma",
    description: `Carrega em ${abilityCycle("plasmaCannon")} turnos. Ao usar, destrói para sempre as próximas ${PLASMA_TRAPS} armadilhas à frente (ocultas também) e empurra ${PLASMA_PUSH} casas para trás o oponente mais adiantado ao alcance.`,
    active: "Alvo atingido",
  },
  transmutation: {
    name: "Transmutação",
    description: `Carrega em ${abilityCycle("transmutation")} turnos. Ao usar, sacrifique ${TRANSMUTATION_CARDS} cartas da mão: os níveis de raridade delas se somam e você ganha uma carta aleatória desse nível (duas de nível 2 viram uma de nível 4; o máximo é o nível ${MAX_RARITY_LEVEL}, lendária). Com menos de ${TRANSMUTATION_CARDS} cartas na mão, ganha uma carta de nível ${TRANSMUTATION_FALLBACK_LEVEL}.`,
    active: "Alquimia feita",
  },
  levitation: {
    name: "Levitação Carmesim",
    description: `Carrega em ${abilityCycle("levitation")} turnos. Ao usar, flutua por ${LEVITATION_TURNS} turnos: nenhuma casa tem efeito sobre você (armadilhas, maldições, bênçãos, portais).`,
    active: `Flutuando por ${LEVITATION_TURNS} turnos: nenhuma casa te afeta`,
  },
  dormantFury: {
    name: "Fúria Adormecida",
    description: `Carrega em ${abilityCycle("dormantFury")} turnos. Ao usar, a rolagem do turno vale o TRIPLO de casas (1 vira ${DORMANT_FURY_MULTIPLIER}, 6 vira ${6 * DORMANT_FURY_MULTIPLIER}) e você cruza o caminho como um raio.`,
    active: `Rolagem deste turno ×${DORMANT_FURY_MULTIPLIER}`,
  },
  arrowRain: {
    name: "Chuva de Flechas",
    description: `Carrega em ${abilityCycle("arrowRain")} turnos. Ao usar, escolha o alvo da chuva de flechas: todos os oponentes, que voltam ${ARROW_RAIN_PUSH} casas, ou as próximas ${ARROW_RAIN_PINS} armadilhas à frente (ocultas e maldições também), que ficam presas até você passar por elas.`,
    active: "As flechas caíram",
  },
  cardGamble: {
    name: "Aposta do Coringa",
    description: `Carrega em ${abilityCycle("cardGamble")} turnos. Ao usar, escolha o oponente e role o dado da sorte: de 1 a ${CARD_GAMBLE_LOSES_UP_TO} ele leva ${CARD_GAMBLE_LOST} carta aleatória sua; de ${CARD_GAMBLE_LOSES_UP_TO + 1} a ${CARD_GAMBLE_JACKPOT - 1} você rouba ${CARD_GAMBLE_STOLEN} cartas aleatórias dele (sozinho, compra ${CARD_GAMBLE_DRAWS}); no ${CARD_GAMBLE_JACKPOT}, rouba ${CARD_GAMBLE_STOLEN} cartas épicas (se faltar épica, completa com outras; sozinho, ganha ${CARD_GAMBLE_EPICS} épicas). Sozinho, o azar descarta 1 carta. Dá para apostar contra quem está protegido ou fora de alcance: ganhando, é bloqueado; perdendo, 1 carta sua vai fora. Sem nenhum oponente ao alcance, você também pode tentar o Lance da Sorte: compra tantas cartas quanto o dado mostrar.`,
    active: "Os dados da sorte rolaram",
  },
  resurrection: {
    name: "Ressurreição",
    description: `Carrega em ${abilityCycle("resurrection")} turnos. Ao usar, escolha até ${RESURRECTION_CARDS} cartas entre as que você já jogou ou descartou: elas voltam para a sua mão, mas viram pó quando saírem dela de novo.`,
    active: "Cartas trazidas de volta",
  },
  forbiddenSeals: {
    name: "Escritura dos 4 Selos",
    description: `Carrega em ${abilityCycle("forbiddenSeals")} turnos. Ao usar, escreva 4 selos em casas até ${SEAL_RANGE} à frente ou atrás; eles se acumulam até alguém pisar. Todos parecem iguais para os outros: Dízimo (rouba a melhor carta), Ruína (volta ${RUIN_PUSH} casas), Silêncio (sem cartas no próximo turno) e Pacto de Sangue (rouba ${BLOOD_PACT_ENERGY} de energia). Sozinho, pisar nos seus selos te recompensa.`,
    active: "Os selos foram escritos",
  },
  spectralApparitions: {
    name: "Aparições Espectrais",
    description: `Carrega em ${abilityCycle("spectralApparitions")} turnos. Ao usar, 2 aparições suas surgem em casas até ${SPECTER_RANGE} à frente ou atrás; elas se acumulam. Quem passar pela da Pilhagem te deixa escolher ${PLUNDER_CARDS} cartas da mão dele; pela da Fome, perde toda a energia para você (o que sobrar adianta sua habilidade). Quem passar por você dissipa todas, até as que ele já tinha passado na mesma jogada. Sozinho, passar pelas suas aparições te recompensa.`,
    active: "As aparições surgiram",
  },
  fairyBloom: {
    name: "Florescimento Feérico",
    description: `Carrega em ${abilityCycle("fairyBloom")} turnos. Ao usar, as próximas ${ENCHANT_TILES} casas ruins à frente (armadilhas, ocultas também, e maldições) viram casas encantadas para sempre (o fogo negro derrete a neve; a neve não pousa sobre ele). Parando numa delas (passar por cima não conta) você avança ${ENCHANT_ADVANCE} casas; se o avanço terminar em outra neve sua, avança mais ${ENCHANT_ADVANCE} (em qualquer outra casa, nada acontece); o oponente que parar numa delas fica preso na neve por ${ENCHANT_FREEZE} rodadas, e cada rodada presa suga ${SNOW_DRAIN} de energia dele para você. Nos dois casos sua habilidade ganha +1 de carga. Quando não sobra nada ruim à frente, começa o Inverno Eterno: a cada rodada ${WINTER_TILES} casas congelam, do início rumo à chegada, e a partir daí a habilidade congela ${WINTER_PICKS === 1 ? "1 casa" : `${WINTER_PICKS} casas`} à sua escolha, em qualquer lugar do caminho, até sob o fogo negro (o inverno apaga o fogo). O gelo funciona igual à neve: prende o oponente, te carrega ${ENCHANT_ADVANCE} casas e dá +1 de carga.`,
    active: "As casas floresceram",
  },
  ocularAwakening: {
    name: "Despertar Ocular",
    description: `Carrega em ${abilityCycle("ocularAwakening")} turnos. Ao usar, escolha: Chamas Eternas (até ${FLAME_TILES} casas de qualquer lugar do caminho pegam fogo negro por ${FLAME_TURNS} rodadas; o oponente que parar numa delas perde ${FLAME_ENERGY} de energia e volta ${FLAME_PUSH} casas; cada fogo apaga depois de queimar ${FLAME_HITS} vezes, e cada vítima dá +1 de carga à sua habilidade) ou Susanoo (por ${ARMOUR_TURNS} rodadas, cartas, habilidades, selos, aparições, armadilhas, maldições e perder a vez não te atingem; só o que ataca por dentro passa: o espinho da armadilha oculta, o fogo negro e a manipulação do tempo).`,
    active: "Os olhos despertaram",
  },
};
