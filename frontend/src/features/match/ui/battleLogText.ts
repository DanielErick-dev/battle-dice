import type { GameEvent } from "@/game/domain/events";
import type { AimWard } from "@/game/domain/players";
import type { Blessing, Player, PlayerId, TrapWard } from "@/game/domain/types";
import { ABILITY_TEXT } from "./abilityText";
import { BLESSING_TEXT } from "./blessingText";
import { cardText } from "./cards/cardText";
import { SEAL_TEXT, SPECTER_TEXT } from "./placementText";
import { voidItemName } from "./voidText";

/** One battle log line (pt-BR): `actor` colours it, `divider` marks a new turn. */
export interface LogLine {
  text: string;
  actor?: PlayerId;
  divider?: boolean;
}

const TRAP_WARDS: Readonly<Record<TrapWard, string>> = {
  shield: "graças ao Escudo Arcano",
  ability: "graças à habilidade",
  halo: "graças à Auréola",
  untamed: "por estar Indomável",
  susanoo: "graças ao Susanoo",
  fallen: "porque o inferno não fere o Caído",
};

const AIM_WARDS: Readonly<Record<AimWard | "away", string>> = {
  untamed: "estava Indomável",
  susanoo: "estava no Susanoo",
  armour: "estava de armadura",
  aegis: "estava sob a Égide",
  away: "estava fora de alcance",
};

const BASIC_BLESSINGS: Readonly<Record<Exclude<Blessing, keyof typeof BLESSING_TEXT>, string>> = {
  energy: "energia",
  charge: "carga de habilidade",
  shield: "Escudo Arcano",
};

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What `event` reads like in the log, or null for those it leaves out (walks, draws, prompts). */
export function battleLogLine(event: GameEvent, players: readonly Player[]): LogLine | null {
  const who = (id: PlayerId): string => {
    const seat = players.findIndex((player) => player.id === id);
    return seat < 0 ? "?" : `J${seat + 1} (${players[seat].name})`;
  };
  const line = (actor: PlayerId, text: string): LogLine => ({ actor, text });

  switch (event.type) {
    case "diceRolled": {
      const parts = event.dice.join(event.best ? " ou " : " + ");
      const bonus = event.bonus ? ` + ${event.bonus}` : "";
      const times = event.multiplier && event.multiplier > 1 ? ` × ${event.multiplier}` : "";
      const detail = event.dice.length > 1 || bonus || times ? ` (${parts}${bonus}${times})` : "";
      return line(
        event.playerId,
        `${who(event.playerId)} rolou ${event.value}${detail}${event.reversed ? ", de ré" : ""}`,
      );
    }
    case "portalEntered":
      return line(event.playerId, `${who(event.playerId)} entrou num portal`);
    case "realmEntered":
      return line(
        event.playerId,
        `${who(event.playerId)} entrou no ${event.realm === "celestial" ? "céu" : "inferno"}`,
      );
    case "blessingReceived": {
      const name =
        event.blessing in BLESSING_TEXT
          ? BLESSING_TEXT[event.blessing as keyof typeof BLESSING_TEXT].name
          : BASIC_BLESSINGS[event.blessing as keyof typeof BASIC_BLESSINGS];
      return line(event.playerId, `${who(event.playerId)} recebeu a bênção: ${name}`);
    }
    case "trapTriggered":
      return line(event.playerId, `${who(event.playerId)} caiu numa armadilha e voltou para a casa ${event.to}`);
    case "advanceTriggered":
      return line(event.playerId, `${who(event.playerId)} avançou até a casa ${event.to}`);
    case "trapCursed":
      if (event.curse === "discard") {
        return line(
          event.playerId,
          event.card
            ? `${who(event.playerId)} foi amaldiçoado e perdeu a carta ${cardText(event.card.cardId, event.card.fused).name}`
            : `${who(event.playerId)} foi amaldiçoado, mas estava sem cartas`,
        );
      }
      return line(event.playerId, `${who(event.playerId)} foi amaldiçoado e perdeu ${event.energyLost} de energia`);
    case "extraTurnGranted":
      return line(event.playerId, `${who(event.playerId)} ganhou uma jogada extra`);
    case "skipTurnGained":
      return line(
        event.playerId,
        `${who(event.playerId)} vai perder ${event.turns && event.turns > 1 ? `${event.turns} vezes` : "a próxima vez"}`,
      );
    case "turnSkipped":
      return line(event.playerId, `${who(event.playerId)} perdeu a vez`);
    case "snowDrained":
      return line(
        event.playerId,
        `${who(event.playerId)} ficou preso na neve: ${event.energy} de energia foi para ${who(event.owner)}`,
      );
    case "trapBlocked":
      return line(event.playerId, `${who(event.playerId)} escapou da armadilha ${TRAP_WARDS[event.ward]}`);
    case "trapDestroyed":
      return line(
        event.playerId,
        `${who(event.playerId)} destruiu ${event.hidden ? "uma armadilha escondida" : `a armadilha da casa ${event.tile}`}`,
      );
    case "arrowsLoosed":
      return line(
        event.playerId,
        event.targets.length > 0
          ? `${who(event.playerId)} fez chover flechas sobre ${plural(event.targets.length, "casa", "casas")} de oponentes`
          : `${who(event.playerId)} cravou flechas em ${plural(event.pinned.length, "armadilha", "armadilhas")} à frente`,
      );
    case "gambleRolled":
      return line(
        event.playerId,
        `${who(event.playerId)} apostou ${event.fortune ? "na sorte" : "contra um oponente"}, tirou ${event.value} e ${event.won ? "ganhou" : "perdeu"}`,
      );
    case "cardsStolen":
      return line(
        event.playerId,
        event.cards.length > 0
          ? `${who(event.playerId)} roubou ${plural(event.cards.length, "carta", "cartas")} de ${who(event.from)}`
          : `${who(event.playerId)} tentou roubar ${who(event.from)}, mas a mão estava vazia`,
      );
    case "spectersSummoned":
      return line(
        event.playerId,
        `${who(event.playerId)} invocou ${plural(event.tiles.length, "aparição", "aparições")}`,
      );
    case "specterStruck":
      return line(
        event.playerId,
        `${who(event.playerId)} esbarrou na ${SPECTER_TEXT[event.kind].name} de ${who(event.owner)}${event.energyTaken > 0 ? ` e perdeu ${event.energyTaken} de energia` : ""}`,
      );
    case "spectersDispelled":
      return line(event.playerId, `${who(event.playerId)} desfez as aparições de ${who(event.owner)}`);
    case "sealsWritten":
      return line(
        event.playerId,
        `${who(event.playerId)} escreveu ${plural(event.tiles.length, "selo", "selos")} proibidos`,
      );
    case "sealBroken":
      return line(
        event.playerId,
        `${who(event.playerId)} rompeu o ${SEAL_TEXT[event.kind].name} de ${who(event.owner)}`,
      );
    case "tilesEnchanted":
      return line(
        event.playerId,
        `${who(event.playerId)} cobriu ${plural(event.tiles.length, "casa", "casas")} de neve`,
      );
    case "enchantmentStirred":
      return line(
        event.playerId,
        event.owner === event.playerId
          ? `${who(event.playerId)} deslizou pela própria neve`
          : `${who(event.playerId)} ficou preso na neve de ${who(event.owner)} por ${plural(event.frozen, "rodada", "rodadas")}`,
      );
    case "winterBegan":
      return line(event.playerId, `${who(event.playerId)} trouxe o Inverno Eterno`);
    case "tilesFrozen":
      return line(event.playerId, `${who(event.playerId)} congelou ${plural(event.tiles.length, "casa", "casas")}`);
    case "flamesLit":
      return line(
        event.playerId,
        `${who(event.playerId)} acendeu o fogo negro em ${plural(event.tiles.length, "casa", "casas")}`,
      );
    case "flamesScorched":
      return line(
        event.playerId,
        `${who(event.playerId)} se queimou no fogo negro de ${who(event.owner)}${event.energyLost > 0 ? ` e perdeu ${event.energyLost} de energia` : ""}`,
      );
    case "armourRaised":
      return line(
        event.playerId,
        `${who(event.playerId)} vestiu a armadura espectral por ${plural(event.turns, "turno", "turnos")}`,
      );
    case "armourHeld":
      return line(event.playerId, `A armadura de ${who(event.playerId)} resistiu`);
    case "cardsResurrected":
      return line(
        event.playerId,
        `${who(event.playerId)} ressuscitou ${plural(event.cards.length, "carta", "cartas")}`,
      );
    case "hiddenTrapSprung":
      return line(event.playerId, `${who(event.playerId)} pisou numa armadilha escondida`);
    case "levitatedOver":
      return line(event.playerId, `${who(event.playerId)} flutuou por cima de uma armadilha`);
    case "abilityReady":
      // The Silent Verdict arms in secret.
      if (event.ability === "silentVerdict") return null;
      return line(event.playerId, `${ABILITY_TEXT[event.ability].name} de ${who(event.playerId)} está pronta`);
    case "abilityUsed":
      return line(event.playerId, `${who(event.playerId)} usou ${ABILITY_TEXT[event.ability].name}`);
    case "abilityBlocked":
      return line(
        event.playerId,
        `${who(event.playerId)} usou ${ABILITY_TEXT[event.ability].name} em ${who(event.targetId)}, mas não funcionou: ${AIM_WARDS[event.ward]}`,
      );
    case "cardBlocked":
      return line(
        event.playerId,
        `${who(event.playerId)} jogou ${cardText(event.cardId).name} em ${who(event.targetId)}, mas não funcionou: ${AIM_WARDS[event.ward]}`,
      );
    case "seraphFell":
      return line(event.playerId, `${who(event.playerId)} pisou no inferno e virou o Anjo Caído`);
    case "crownGained":
      return line(
        event.playerId,
        `${who(event.playerId)} ganhou a ${event.crown === "infernal" ? "Coroa Infernal" : "Coroa Seráfica"}`,
      );
    case "heavenBarred":
      return line(
        event.playerId,
        `${who(event.playerId)} foi acorrentado pelo céu por ${plural(event.rounds, "rodada", "rodadas")}`,
      );
    case "hellDragged":
      return line(event.playerId, `${who(event.playerId)} arrastou ${who(event.targetId)} para o inferno`);
    case "boardCleansed":
      return line(
        event.playerId,
        `${who(event.playerId)} limpou ${plural(event.tiles.length, "casa", "casas")} à frente`,
      );
    case "timeBent":
      return line(
        event.playerId,
        event.power === "halt"
          ? `${who(event.playerId)} parou o tempo de ${who(event.targetId)} por ${plural(event.rounds, "rodada", "rodadas")}`
          : `${who(event.playerId)} fez ${who(event.targetId)} andar de ré nas próximas ${plural(event.rounds, "rolagem", "rolagens")}`,
      );
    case "untamedUnleashed":
      return line(
        event.playerId,
        `${who(event.playerId)} ficou Indomável por ${plural(event.turns, "turno", "turnos")}`,
      );
    case "playerTrampled":
      return line(
        event.by,
        `${who(event.by)} atropelou ${who(event.playerId)} e o mandou ${plural(event.path.length, "casa", "casas")} para trás`,
      );
    case "voidSwallowed":
      return line(event.playerId, `O Vazio de ${who(event.playerId)} engoliu: ${voidItemName(event.item)}`);
    case "riftOpened":
      return line(event.playerId, `${who(event.playerId)} abriu uma fenda do Vazio no caminho`);
    case "voidCast":
      return line(
        event.playerId,
        `${who(event.playerId)} soltou do Vazio: ${voidItemName(event.item)}, na casa ${event.tile}`,
      );
    case "voidSeized":
      return line(
        event.playerId,
        `O Vazio de ${who(event.playerId)} tomou: ${voidItemName(event.item)}, da casa ${event.tile}`,
      );
    case "voidEchoed":
      return line(event.playerId, `O Vazio de ${who(event.playerId)} duplicou: ${voidItemName(event.item)}`);
    case "energyWeighed":
      return line(
        event.playerId,
        `⚖ ${who(event.playerId)} pesou a energia com ${who(event.targetId)}: ficou com ${event.energy}, e o outro com ${event.targetEnergy}`,
      );
    case "susanooRepelled":
      return line(event.by, `O Susanoo de ${who(event.by)} repeliu ${who(event.playerId)}`);
    case "cardTransmuted":
      return line(
        event.playerId,
        `${who(event.playerId)} transmutou ${cardText(event.from.cardId, event.from.fused).name} em ${cardText(event.to.cardId, event.to.fused).name}`,
      );
    case "cardsFused":
      return line(event.playerId, `${who(event.playerId)} fundiu cartas em ${cardText(event.card.cardId, true).name}`);
    case "cardPlayed":
      return line(
        event.playerId,
        `${who(event.playerId)} jogou ${cardText(event.card.cardId, event.card.fused).name}${event.targetId ? ` em ${who(event.targetId)}` : ""}`,
      );
    case "cardDiscarded":
      return line(
        event.playerId,
        `${who(event.playerId)} descartou ${cardText(event.card.cardId, event.card.fused).name}`,
      );
    case "playerPushed":
      return line(
        event.by,
        event.by === event.playerId
          ? `${who(event.playerId)} voltou ${plural(event.path.length, "casa", "casas")}`
          : `${who(event.by)} empurrou ${who(event.playerId)} ${plural(event.path.length, "casa", "casas")} para trás`,
      );
    case "cardTeleported":
      return line(event.playerId, `${who(event.playerId)} se teletransportou para a casa ${event.to}`);
    case "playerWon":
      return line(event.playerId, `🏆 ${who(event.playerId)} venceu a partida!`);
    case "turnChanged":
      return { actor: event.playerId, text: `Vez de ${who(event.playerId)}`, divider: true };
    case "verdictPassed":
      return line(
        event.playerId,
        `⚖ ${who(event.playerId)} julgou ${who(event.attackerId)}: o ataque se voltou contra ele`,
      );
    case "hiddenTrapDisarmed":
      return line(
        event.playerId,
        `${who(event.playerId)} desarmou uma armadilha escondida${event.energyGained > 0 ? ` (+${event.energyGained} de energia)` : ""}`,
      );
    case "playerMoved":
    case "cardDrawn":
    case "deckReshuffled":
    case "discardRequired":
    case "wardOffered":
    case "graceOffered":
    case "plunderOffered":
    case "voidFed":
    case "winterSpread":
    case "flamesFaded":
    case "trapUnpinned":
    case "gameRestarted":
      return null;
  }
}
