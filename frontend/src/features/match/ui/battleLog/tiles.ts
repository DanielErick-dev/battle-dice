import type { Blessing, TrapWard } from "@/game/domain/types";
import { BLESSING_TEXT } from "../blessingText";
import { cardText } from "../cards/cardText";
import { plural, type LogLines } from "./lines";

const TRAP_WARDS: Readonly<Record<TrapWard, string>> = {
  shield: "graças ao Escudo Arcano",
  ability: "graças à habilidade",
  halo: "graças à Auréola",
  untamed: "por estar Indomável",
  susanoo: "graças ao Susanoo",
  fallen: "porque o inferno não fere o Caído",
};

const BASIC_BLESSINGS: Readonly<Record<Exclude<Blessing, keyof typeof BLESSING_TEXT>, string>> = {
  energy: "energia",
  charge: "carga de habilidade",
  shield: "Escudo Arcano",
};

/** What the board's tiles do to whoever stops on them. */
export const tilesLines: LogLines<
  | "portalEntered"
  | "realmEntered"
  | "blessingReceived"
  | "trapTriggered"
  | "advanceTriggered"
  | "trapCursed"
  | "trapBlocked"
  | "trapDestroyed"
  | "hiddenTrapSprung"
  | "playerPushed"
> = {
  portalEntered: (event, { who, line }) => line(event.playerId, `${who(event.playerId)} entrou num portal`),
  realmEntered: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} entrou no ${event.realm === "celestial" ? "céu" : "inferno"}`),
  blessingReceived: (event, { who, line }) => {
    const name =
      event.blessing in BLESSING_TEXT
        ? BLESSING_TEXT[event.blessing as keyof typeof BLESSING_TEXT].name
        : BASIC_BLESSINGS[event.blessing as keyof typeof BASIC_BLESSINGS];
    return line(event.playerId, `${who(event.playerId)} recebeu a bênção: ${name}`);
  },
  trapTriggered: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} caiu numa armadilha e voltou para a casa ${event.to}`),
  advanceTriggered: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} avançou até a casa ${event.to}`),
  trapCursed: (event, { who, line }) => {
    if (event.curse === "discard") {
      return line(
        event.playerId,
        event.card
          ? `${who(event.playerId)} foi amaldiçoado e perdeu a carta ${cardText(event.card.cardId, event.card.fused).name}`
          : `${who(event.playerId)} foi amaldiçoado, mas estava sem cartas`,
      );
    }
    return line(event.playerId, `${who(event.playerId)} foi amaldiçoado e perdeu ${event.energyLost} de energia`);
  },
  trapBlocked: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} escapou da armadilha ${TRAP_WARDS[event.ward]}`),
  trapDestroyed: (event, { who, line }) =>
    line(
      event.playerId,
      `${who(event.playerId)} destruiu ${event.hidden ? "uma armadilha escondida" : `a armadilha da casa ${event.tile}`}`,
    ),
  hiddenTrapSprung: (event, { who, line }) =>
    line(event.playerId, `${who(event.playerId)} pisou numa armadilha escondida`),
  playerPushed: (event, { who, line }) =>
    line(
      event.by,
      event.by === event.playerId
        ? `${who(event.playerId)} voltou ${plural(event.path.length, "casa", "casas")}`
        : `${who(event.by)} empurrou ${who(event.playerId)} ${plural(event.path.length, "casa", "casas")} para trás`,
    ),
};
