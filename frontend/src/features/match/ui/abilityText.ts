import {
  abilityCycle,
  TRANSMUTATION_CARDS,
  TRANSMUTATION_FALLBACK_LEVEL,
  ARROW_RAIN_PINS,
  BLOOD_PACT_ENERGY,
  ARROW_RAIN_PUSH,
  CARD_GAMBLE_DRAWS,
  CARD_GAMBLE_EPICS,
  CARD_GAMBLE_JACKPOT,
  CARD_GAMBLE_LOSES_UP_TO,
  CARD_GAMBLE_LOST,
  CARD_GAMBLE_STOLEN,
  DORMANT_FURY_MULTIPLIER,
  PLASMA_PUSH,
  PLASMA_TRAPS,
  STUDY_DRAWS,
  TAILWIND_BONUS,
  TIDE_RANGE,
  TRAMPLE_PUSH,
  UNTAMED_TURNS,
  TIME_ROUNDS,
  LEVITATION_TURNS,
  RESURRECTION_CARDS,
  RUIN_PUSH,
  SEAL_RANGE,
  PLUNDER_CARDS,
  SPECTER_RANGE,
  type AbilityId,
  ARMOUR_TURNS,
  ENCHANT_ADVANCE,
  ENCHANT_FREEZE,
  SNOW_DRAIN,
  ENCHANT_TILES,
  FLAME_ENERGY,
  FLAME_HITS,
  FLAME_PUSH,
  FLAME_TILES,
  FLAME_TURNS,
} from "@/game/domain/abilities";
import { MAX_RARITY_LEVEL } from "@/game/domain/cards";
import { BLESSING_TURNS, SERAPH_BLESSING_TURNS } from "@/game/domain/blessings";
import { CROWN_BONUS, DRAG_TRAPS } from "@/game/domain/seraph";

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
  trapWard: {
    name: "Armadura do Vazio",
    description: `Carrega em ${abilityCycle("trapWard")} turnos. Ao cair numa armadilha ou maldição, escolha se quer anulá-la; a armadilha é destruída para sempre.`,
    active: "A armadilha não te atinge",
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
    description: `Carrega em ${abilityCycle("seraphBlessing")} turnos. Ao usar, recebe um presente do céu aleatório: uma bênção (Asas, Auréola, Inspiração ou Fonte de Luz) ou uma carta qualquer do baralho na mão. Passivas: suas bênçãos duram ${SERAPH_BLESSING_TURNS} rodadas (as dos outros, ${BLESSING_TURNS}); no céu, você escolhe a bênção e a relíquia de cada casa; ao sair do céu ganha a Coroa Seráfica (+${CROWN_BONUS} casas em toda rolagem até o fim). Cuidado: se pisar no inferno, cai para sempre e vira o Anjo Caído.`,
    active: "Uma bênção desce do céu",
  },
  hellsDrag: {
    name: "Arrastar ao Inferno",
    description: `Carrega em ${abilityCycle("hellsDrag")} turnos. Ao usar, escolha um oponente: uma mão do inferno o agarra e o leva direto para o começo do inferno (quem está no céu ou no inferno escapa). Se ele estiver Indomável ou com armadura, a mão é repelida e a habilidade é gasta à toa. Sozinho, o inferno engole as próximas ${DRAG_TRAPS} armadilhas à frente. Passivas do Anjo Caído: o inferno não te fere, o céu está fechado para você e a Coroa Infernal dá +${CROWN_BONUS} casas em toda rolagem.`,
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
  sacredBulwark: {
    name: "Baluarte Sagrado",
    description: `Carrega em ${abilityCycle("sacredBulwark")} turnos. Ao usar, ergue o Escudo Arcano e uma Armadura Espectral por ${ARMOUR_TURNS} rodadas.`,
    active: "Escudo e armadura erguidos",
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
    description: `Carrega em ${abilityCycle("spectralApparitions")} turnos. Ao usar, 2 aparições suas surgem em casas até ${SPECTER_RANGE} à frente ou atrás; elas se acumulam. Quem passar pela da Pilhagem te deixa escolher ${PLUNDER_CARDS} cartas da mão dele; pela da Fome, perde toda a energia para você (o que sobrar adianta sua habilidade). Quem passar por você dissipa todas. Sozinho, passar pelas suas aparições te recompensa.`,
    active: "As aparições surgiram",
  },
  fairyBloom: {
    name: "Florescimento Feérico",
    description: `Carrega em ${abilityCycle("fairyBloom")} turnos. Ao usar, as próximas ${ENCHANT_TILES} casas ruins à frente (armadilhas, ocultas também, e maldições) viram casas encantadas para sempre (o fogo negro derrete a neve; a neve não pousa sobre ele). Parando numa delas (passar por cima não conta) você avança ${ENCHANT_ADVANCE} casas; se o avanço terminar em outra neve sua, avança mais ${ENCHANT_ADVANCE} (em qualquer outra casa, nada acontece); o oponente que parar numa delas fica preso na neve por ${ENCHANT_FREEZE} rodadas, e cada rodada presa suga ${SNOW_DRAIN} de energia dele para você. Nos dois casos sua habilidade ganha +1 de carga.`,
    active: "As casas floresceram",
  },
  ocularAwakening: {
    name: "Despertar Ocular",
    description: `Carrega em ${abilityCycle("ocularAwakening")} turnos. Ao usar, escolha: Chamas Eternas (até ${FLAME_TILES} casas de qualquer lugar do caminho pegam fogo negro por ${FLAME_TURNS} rodadas; o oponente que parar numa delas perde ${FLAME_ENERGY} de energia e volta ${FLAME_PUSH} casas; cada fogo apaga depois de queimar ${FLAME_HITS} vezes, e cada vítima dá +1 de carga à sua habilidade) ou Susanoo (por ${ARMOUR_TURNS} rodadas, cartas, habilidades, selos, aparições, armadilhas, maldições e perder a vez não te atingem; só o que ataca por dentro passa: o espinho da armadilha oculta, o fogo negro e a manipulação do tempo).`,
    active: "Os olhos despertaram",
  },
};
