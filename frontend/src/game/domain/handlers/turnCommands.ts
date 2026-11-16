import { at } from "../core/invariant";
import { rollMultiplier } from "../abilities/basic";
import { unpinPassed } from "../characters/archer/arrowRain";
import { walkTrampling } from "../characters/bjorn/untamed";
import { blessingCount, WINGS_BONUS } from "../board/blessings";
import type { DiceRoller } from "../core/dice";
import { playerIn, startDraft, updatePlayer } from "../core/draft";
import { pushPath, walkPath } from "../board/paths";
import type { GameEvent } from "../core/events";
import { resolveLanding } from "../board/landing";
import { CROWN_BONUS } from "../characters/seraphiel/seraph";
import { crossSpecters } from "../characters/warden/specters";
import { CONTAINED_DIE, containedFace } from "../characters/themis/cards";
import { closeRifts } from "../characters/zarek/rifts";
import { burntRoll, prepareRoll, settleRoll } from "../characters/akane/fire";
import { slideOnEmbers } from "../characters/akane/cards";
import type { DiceBoost, PlayerId } from "../core/state";
import {
  walkThroughWalls,
  combustionMultiplier,
  detonate,
  pullTethered,
  stealRoll,
} from "../characters/tenzai/elements";
import { openingState } from "./setup";
import { assertCanAct, settle } from "./shared";
import type { CommandHandlers } from "./types";

export const turnCommands: CommandHandlers<"rollDice" | "forfeitTurn" | "restart"> = {
  rollDice: (state, { playerId }, deps) => {
    assertCanAct(state, playerId);
    const draft = startDraft(state, deps.random);
    const { bonus: impetus, boost } = prepareRoll(draft, playerId);
    const player = playerIn(draft, playerId);

    const { diceBonuses } = player;
    // Under Themis's Containment Decree the die never shows more than CONTAINED_DIE.
    const contained = player.containedRolls > 0;
    const rollDie = contained ? () => containedFace(deps.rollDice()) : deps.rollDice;
    const thrown = throwDice(
      playerId,
      boost,
      {
        extra:
          diceBonuses.reduce((sum, { amount }) => sum + amount, 0) +
          blessingCount(state.board, player, "wings") * WINGS_BONUS +
          (player.crown ? CROWN_BONUS : 0) +
          impetus,
        multiplier: rollMultiplier(state.abilityInUse),
      },
      rollDie,
      contained,
    );
    // On Akane's fire the whole walk is halved, rounded down: a 1 doesn't move at all.
    const burnt = player.burning > 0;
    // Tenzai's Combustion Die: a high face multiplies the whole walk, then explodes once he stops.
    const combustion = combustionMultiplier(player, Math.max(...thrown.dice));
    const walked = burnt ? burntRoll(thrown.value) : thrown.value;
    const rolled = {
      ...thrown,
      ...(burnt && { halved: true }),
      value: walked * combustion,
      ...(combustion > 1 && { combustion }),
      ...(impetus > 0 && { impetus: true }),
    };
    updatePlayer(draft, playerId, (current) => ({
      tenzai: { ...current.tenzai, combustion: null },
      containedRolls: Math.max(0, current.containedRolls - 1),
      diceBoost: null, // every boost is spent by a single roll
      diceBonuses: diceBonuses.filter(({ rolls }) => rolls > 1).map((bonus) => ({ ...bonus, rolls: bonus.rolls - 1 })),
    }));

    // Under Cronos's reversed time the roll walks back the way the player came.
    const reversed = player.reversedRolls > 0;
    if (reversed) updatePlayer(draft, playerId, (current) => ({ reversedRolls: current.reversedRolls - 1 }));
    let path = reversed
      ? pushPath(state.board, player.position, rolled.value, player.realmEntry)
      : walkPath(state.board, player.position, rolled.value, player.realmEntry);
    const dash = rolled.multiplier !== undefined;
    if (reversed)
      draft.events.push({ ...rolled, reversed }, { type: "playerMoved", playerId, path, ...(dash && { dash }) });
    else {
      draft.events.push(rolled);
      // Tenzai's breeze takes the whole roll for him; otherwise walls in the way eat part of the walk.
      if (stealRoll(draft, playerId, rolled.value)) path = [];
      else path = walkThroughWalls(draft, playerId, path, (tiles) => walkTrampling(draft, playerId, tiles, dash));
    }
    crossSpecters(draft, playerId, path);
    if (path.length > 0) resolveLanding(draft, playerId, path.at(-1) ?? player.position);
    unpinPassed(draft, path);
    if (!reversed) pullTethered(draft, playerId, path.length);
    if (combustion > 1 && player.tenzai.combustion) detonate(draft, playerId, player.tenzai.combustion.push);
    slideOnEmbers(draft, playerId);
    const face = thrown.best ? Math.max(...thrown.dice) : thrown.dice.reduce((sum, die) => sum + die, 0);
    settleRoll(draft, playerId, face, boost?.kind === "fixed");

    const extraTurn = draft.extraTurn || state.bonusTurn;
    return settle(draft, playerId, { endsTurn: true, extraTurn });
  },

  // Out of time: the turn ends where it stands, losing any extra turn it had earned.
  forfeitTurn: (state, { playerId }, deps) => {
    assertCanAct(state, playerId);
    const draft = startDraft({ ...state, bonusTurn: false }, deps.random);
    draft.events.push({ type: "turnTimedOut", playerId });
    return settle(draft, playerId, { endsTurn: true, extraTurn: false });
  },

  restart: (state, _command, deps) => ({
    state: { ...openingState(closeRifts(state.board), state.players, state.decks, deps.random), rng: state.rng },
    events: [{ type: "gameRestarted" }, { type: "turnChanged", playerId: at(state.players, 0).id }],
  }),
};

type DiceRolledEvent = Extract<GameEvent, { type: "diceRolled" }>;

/** The die as the card boost says, plus `extra` tiles, then times the ability's `multiplier`. */
function throwDice(
  playerId: PlayerId,
  boost: DiceBoost | null,
  ability: { extra: number; multiplier: number },
  rollDie: DiceRoller,
  contained: boolean,
): DiceRolledEvent {
  const fixed =
    boost?.kind === "fixed" && contained ? { ...boost, value: Math.min(boost.value, CONTAINED_DIE) } : boost;
  const thrown = throwBoostedDice(playerId, fixed, rollDie);
  const { extra, multiplier } = ability;
  const event = extra === 0 ? thrown : { ...thrown, value: thrown.value + extra, bonus: (thrown.bonus ?? 0) + extra };
  return multiplier === 1 ? event : { ...event, value: event.value * multiplier, multiplier };
}

function throwBoostedDice(playerId: PlayerId, boost: DiceBoost | null, rollDie: DiceRoller): DiceRolledEvent {
  switch (boost?.kind) {
    case "fixed":
      return { type: "diceRolled", playerId, value: boost.value, dice: [boost.value] };
    case "double": {
      const first = rollDie();
      const second = rollDie();
      return { type: "diceRolled", playerId, value: first + second, dice: [first, second] };
    }
    case "best": {
      const dice = [rollDie(), rollDie()];
      return { type: "diceRolled", playerId, value: Math.max(...dice), dice, best: true };
    }
    case undefined: {
      const die = rollDie();
      return { type: "diceRolled", playerId, value: die, dice: [die] };
    }
  }
}
