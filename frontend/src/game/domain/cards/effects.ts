import { MAX_ENERGY } from "../core/energy";
import { announceReady, chargeInDraft, fillAbility } from "../abilities/charge";
import { unpinPassed } from "../characters/archer/arrowRain";
import { VERDICT_MULTIPLIER } from "../characters/themis/verdict";
import { drawCard } from "./hand";
import { playerIn, updatePlayer, type Draft } from "../core/draft";
import { pushPath, walkPath } from "../board/paths";
import type { DiceRoller } from "../core/dice";
import { resolveLanding } from "../board/landing";
import { crossSpecters } from "../characters/warden/specters";
import { dragIntoHell } from "../characters/seraphiel/seraph";
import { walkTrampling } from "../characters/bjorn/untamed";
import {
  FUSED_AEGIS_TURNS,
  FUSED_BLAST_PUSH,
  FUSED_HERB_CHARGE,
  FUSED_LUCKY_BONUS,
  FUSED_SCROLL_DRAWS,
  FUSED_SHIELD_ARMOUR,
  FUSED_WIND_STEP_TILES,
} from "./fusion";
import { quench } from "../characters/akane/fire";
import { playExclusive } from "./exclusive";
import type { TileId } from "../board/types";
import type { CardInstance, PlayerId } from "../core/state";

export const ARCANE_BLAST_PUSH = 7;
export const HEALING_HERB_ENERGY = 6;
const ANCIENT_SCROLL_DRAWS = 2;
const LUCKY_CHARM_BONUS = 2;
/** Own turns, counting the one it's played in. */
export const AEGIS_TURNS = 3;
export const AWAKENING_BONUS = 3;
const AWAKENING_ROLLS = 2;
const WIND_STEP_TILES = 3;

export interface CardEffectContext {
  targetId: PlayerId | null;
  value: number | null;
  portal: TileId | null;
  rollDie: DiceRoller;
  doubled?: boolean;
}

/** What the card does once paid for and past every ward; exclusive cards go on to playExclusive. */
export function applyCardEffect(
  draft: Draft,
  playerId: PlayerId,
  card: CardInstance,
  { targetId, value, portal, rollDie, doubled = false }: CardEffectContext,
): void {
  // Turned by Themis's verdict, the attack comes back twice as hard.
  const times = doubled ? VERDICT_MULTIPLIER : 1;
  const { board } = draft.state;
  const position = playerIn(draft, playerId).position;

  switch (card.cardId) {
    case "windStep": {
      // Under Cronos's reversed time the wind blows them back the way they came, like their rolls.
      const { reversedRolls, realmEntry } = playerIn(draft, playerId);
      const windTiles = card.fused ? FUSED_WIND_STEP_TILES : WIND_STEP_TILES;
      const reversed = reversedRolls > 0;
      const path = reversed
        ? pushPath(board, position, windTiles, realmEntry)
        : walkPath(board, position, windTiles, realmEntry);
      if (reversed) draft.events.push({ type: "playerMoved", playerId, path });
      else walkTrampling(draft, playerId, path);
      crossSpecters(draft, playerId, path);
      resolveLanding(draft, playerId, path.at(-1) ?? position);
      unpinPassed(draft, path);
      break;
    }
    case "abyssCall":
      if (targetId !== null) dragIntoHell(draft, playerId, targetId);
      break;
    case "healingHerb":
      updatePlayer(draft, playerId, (player) => ({
        // Fused, it fills the energy right up.
        energy: card.fused ? MAX_ENERGY : Math.min(MAX_ENERGY, player.energy + HEALING_HERB_ENERGY),
        skipTurns: 0,
        snowbound: null,
        chained: 0,
      }));
      // It soothes burns too, before the energy comes in.
      quench(draft, playerId, [playerId]);
      if (card.fused && chargeInDraft(draft, playerId, FUSED_HERB_CHARGE).becameReady) announceReady(draft, playerId);
      break;
    case "arcaneShield":
      updatePlayer(draft, playerId, () => ({ shielded: true }));
      // Fused, Spectral Armour comes with the shield.
      if (card.fused) {
        updatePlayer(draft, playerId, (player) => ({
          spectralArmour: Math.max(player.spectralArmour, FUSED_SHIELD_ARMOUR),
        }));
        draft.events.push({ type: "armourRaised", playerId, turns: FUSED_SHIELD_ARMOUR });
      }
      break;
    case "ancientScroll":
      for (let draw = 0; draw < (card.fused ? FUSED_SCROLL_DRAWS : ANCIENT_SCROLL_DRAWS); draw++) {
        drawCard(draft, playerId);
      }
      break;
    case "luckyCharm":
      updatePlayer(draft, playerId, (player) => ({
        diceBonuses: [
          ...player.diceBonuses,
          {
            amount: card.fused ? FUSED_LUCKY_BONUS : LUCKY_CHARM_BONUS,
            rolls: 1,
          },
        ],
      }));
      break;
    case "oracleEye":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "best" } }));
      break;
    case "ancestralAwakening":
      updatePlayer(draft, playerId, (player) => ({
        diceBonuses: [...player.diceBonuses, { amount: AWAKENING_BONUS, rolls: AWAKENING_ROLLS }],
      }));
      break;
    case "berserkFury":
      updatePlayer(draft, playerId, () => ({ diceBoost: { kind: "double" } }));
      break;
    case "fateRune":
      updatePlayer(draft, playerId, () => ({
        diceBoost: { kind: "fixed", value: value ?? 1 },
      }));
      break;
    case "mysticGate":
      if (portal === null) break;
      draft.events.push({
        type: "cardTeleported",
        playerId,
        from: position,
        to: portal,
      });
      resolveLanding(draft, playerId, portal);
      break;
    case "arcaneBlast": {
      if (targetId === null) break;
      const { position: from, realmEntry } = playerIn(draft, targetId);
      const push = (card.fused ? FUSED_BLAST_PUSH : ARCANE_BLAST_PUSH) * times;
      const path = pushPath(board, from, push, realmEntry);
      draft.events.push({
        type: "playerPushed",
        playerId: targetId,
        by: playerId,
        path,
      });
      updatePlayer(draft, targetId, () => ({ position: path.at(-1) ?? from }));
      break;
    }
    case "fateSwap": {
      // The player and the target trade places; neither tile does anything on arrival.
      if (targetId === null) break;
      const theirs = playerIn(draft, targetId).position;
      draft.events.push(
        { type: "cardTeleported", playerId, from: position, to: theirs },
        { type: "cardTeleported", playerId: targetId, from: theirs, to: position },
      );
      updatePlayer(draft, playerId, () => ({ position: theirs }));
      updatePlayer(draft, targetId, () => ({ position }));
      break;
    }
    case "celestialLight":
      updatePlayer(draft, playerId, () => ({ energy: MAX_ENERGY }));
      // Fused (Divine Dawn): the ability ready too, and free of lost turns and snow.
      if (card.fused) {
        updatePlayer(draft, playerId, () => ({
          skipTurns: 0,
          snowbound: null,
        }));
        fillAbility(draft, playerId);
      }
      break;
    case "heavenlyAegis": {
      // Fused (Celestial Sanctuary): twice as long, with the Arcane Shield.
      const turns = card.fused ? FUSED_AEGIS_TURNS : AEGIS_TURNS;
      updatePlayer(draft, playerId, () => ({
        spectralArmour: turns,
        divineAegis: turns,
        ...(card.fused && { shielded: true }),
      }));
      draft.events.push({ type: "armourRaised", playerId, turns });
      break;
    }
    case "ascension":
      fillAbility(draft, playerId);
      // Fused (Apotheosis): another turn once this one is over.
      if (card.fused) draft.extraTurn = true;
      break;
    case "blindingFlash":
      if (targetId === null) break;
      draft.events.push({
        type: "skipTurnGained",
        playerId: targetId,
        tile: playerIn(draft, targetId).position,
        by: playerId,
        ...(times > 1 && { turns: times }),
      });
      updatePlayer(draft, targetId, (target) => ({
        skipTurns: target.skipTurns + times,
      }));
      break;
    default:
      playExclusive(draft, playerId, card.cardId, targetId, rollDie);
  }
}
