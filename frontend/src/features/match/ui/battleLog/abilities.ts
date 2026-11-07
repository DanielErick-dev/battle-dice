import type { AimWard } from "@/game/domain/core/playerStatus";
import { ABILITY_TEXT } from "../abilityText";
import { plural, type LogLines } from "./lines";

export const AIM_WARDS: Readonly<Record<AimWard | "away", string>> = {
  untamed: "estava Indomável",
  susanoo: "estava no Susanoo",
  armour: "estava de armadura",
  aegis: "estava sob a Égide",
  away: "estava fora de alcance",
};

/** Abilities, and those that need no more than one line. */
export const abilitiesLines: LogLines<
  | "abilityReady"
  | "abilityUsed"
  | "abilityBlocked"
  | "levitatedOver"
  | "boardCleansed"
  | "timeBent"
  | "armourRaised"
  | "armourHeld"
> = {
  abilityReady: (event, { who, line }) => {
    // The Silent Verdict arms in secret.
    if (event.ability === "silentVerdict") return null;
    return line(event.playerId, `${ABILITY_TEXT[event.ability].name} de ${who(event.playerId)} está pronta`);
  },
  abilityUsed: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} usou ${ABILITY_TEXT[event.ability].name}`),
  abilityBlocked: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} usou ${ABILITY_TEXT[event.ability].name} em ${who(event.targetId)}, mas não funcionou: ${AIM_WARDS[event.ward]}`,
    ),
  levitatedOver: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} flutuou por cima de uma armadilha`),
  boardCleansed: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} limpou ${plural(event.tiles.length, "casa", "casas")} à frente`),
  timeBent: (event, { who, line }) =>
    line(
      event.playerId,
      event.power === "halt"
        ? `${who(event.playerId)} parou o tempo de ${who(event.targetId)} por ${plural(event.rounds, "rodada", "rodadas")}`
        : `${who(event.playerId)} fez ${who(event.targetId)} andar de ré nas próximas ${plural(event.rounds, "rolagem", "rolagens")}`,
    ),
  armourRaised: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} vestiu a armadura espectral por ${plural(event.turns, "turno", "turnos")}`,
    ),
  armourHeld: (event, { who, line }) => line(event.playerId, `A armadura de ${who(event.playerId)} resistiu`),
};
