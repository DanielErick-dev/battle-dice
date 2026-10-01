import {
  abilityCycle,
  ARROW_RAIN_PINS,
  BLOOD_PACT_ENERGY,
  ARROW_RAIN_PUSH,
  CARD_GAMBLE_DRAWS,
  CARD_GAMBLE_LOSES_UP_TO,
  CARD_GAMBLE_LOST,
  CARD_GAMBLE_STOLEN,
  CELESTIAL_GRACE_ENERGY,
  CRIMSON_MARCH_BONUS,
  DORMANT_FURY_MULTIPLIER,
  DRAGON_HOARD_DRAWS,
  LEVITATION_TURNS,
  RESURRECTION_CARDS,
  RUIN_PUSH,
  SEAL_RANGE,
  PLUNDER_CARDS,
  SPECTER_RANGE,
  type AbilityId,
} from "@/game/domain/abilities";

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
  crimsonMarch: {
    name: "Marcha Carmesim",
    description: `Carrega em ${abilityCycle("crimsonMarch")} turnos. Ao usar, a rolagem do turno anda +${CRIMSON_MARCH_BONUS} casas.`,
    active: `+${CRIMSON_MARCH_BONUS} casas na rolagem deste turno`,
  },
  celestialGrace: {
    name: "Graça Celestial",
    description: `Carrega em ${abilityCycle("celestialGrace")} turnos. Ao usar, ganha +${CELESTIAL_GRACE_ENERGY} de energia na hora.`,
    active: `+${CELESTIAL_GRACE_ENERGY} de energia`,
  },
  dragonHoard: {
    name: "Tesouro do Dragão",
    description: `Carrega em ${abilityCycle("dragonHoard")} turnos. Ao usar, compra ${DRAGON_HOARD_DRAWS} cartas na hora.`,
    active: `+${DRAGON_HOARD_DRAWS} cartas na mão`,
  },
  transmutation: {
    name: "Transmutação",
    description: `Carrega em ${abilityCycle("transmutation")} turnos. Ao usar, escolha uma carta da mão: ela vira uma carta rara ou épica aleatória.`,
    active: "Uma carta foi transmutada",
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
    description: `Carrega em ${abilityCycle("arrowRain")} turnos. Ao usar, uma chuva de flechas faz todos os adversários voltarem ${ARROW_RAIN_PUSH} casas. Sozinha no tabuleiro, as flechas prendem as próximas ${ARROW_RAIN_PINS} armadilhas à frente (ocultas e maldições também) até você passar por elas.`,
    active: "As flechas caíram",
  },
  cardGamble: {
    name: "Aposta do Coringa",
    description: `Carrega em ${abilityCycle("cardGamble")} turnos. Ao usar, rola o dado da sorte: de 1 a ${CARD_GAMBLE_LOSES_UP_TO} você perde ${CARD_GAMBLE_LOST} carta aleatória para um oponente; de ${CARD_GAMBLE_LOSES_UP_TO + 1} a 6 rouba ${CARD_GAMBLE_STOLEN} cartas aleatórias de um oponente. Sozinho: perde 1 carta ou compra ${CARD_GAMBLE_DRAWS}.`,
    active: "Os dados da sorte rolaram",
  },
  resurrection: {
    name: "Ressurreição",
    description: `Carrega em ${abilityCycle("resurrection")} turnos. Ao usar, escolha até ${RESURRECTION_CARDS} cartas entre as que você já jogou ou descartou: elas voltam para a sua mão, mas viram pó quando saírem dela de novo.`,
    active: "Cartas trazidas de volta",
  },
  forbiddenSeals: {
    name: "Escritura dos 4 Selos",
    description: `Carrega em ${abilityCycle("forbiddenSeals")} turnos. Ao usar, escreva 4 selos em casas até ${SEAL_RANGE} à frente ou atrás. Todos parecem iguais para os outros: Dízimo (rouba a melhor carta), Ruína (volta ${RUIN_PUSH} casas), Silêncio (sem cartas no próximo turno) e Pacto de Sangue (rouba ${BLOOD_PACT_ENERGY} de energia). Sozinho, pisar nos seus selos te recompensa.`,
    active: "Os selos foram escritos",
  },
  spectralApparitions: {
    name: "Aparições Espectrais",
    description: `Carrega em ${abilityCycle("spectralApparitions")} turnos. Ao usar, 2 aparições suas surgem em casas até ${SPECTER_RANGE} à frente ou atrás. Quem passar pela da Pilhagem te deixa escolher ${PLUNDER_CARDS} cartas da mão dele; pela da Fome, perde toda a energia para você (o que sobrar adianta sua habilidade). Quem passar por você dissipa as duas. Sozinho, passar pelas suas aparições te recompensa.`,
    active: "As aparições surgiram",
  },
};
