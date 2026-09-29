import {
  abilityCycle,
  CELESTIAL_GRACE_ENERGY,
  CRIMSON_MARCH_BONUS,
  DRAGON_HOARD_DRAWS,
  LEVITATION_TURNS,
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
  levitation: {
    name: "Levitação Carmesim",
    description: `Carrega em ${abilityCycle("levitation")} turnos. Ao usar, flutua por ${LEVITATION_TURNS} turnos: nenhuma casa tem efeito sobre você (armadilhas, maldições, bênçãos, portais).`,
    active: `Flutuando por ${LEVITATION_TURNS} turnos: nenhuma casa te afeta`,
  },
};
