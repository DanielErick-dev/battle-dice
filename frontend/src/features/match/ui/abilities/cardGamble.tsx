import { Layers } from "lucide-react";
import { opponentsInReach } from "@/game/domain/board";
import { gambleTargets } from "@/game/domain/cardGamble";
import { TargetPicker } from "../hud/TargetPicker";
import { seated } from "./seated";
import type { AbilityFlow, AbilityScene } from "./types";

// Card Gamble bets against anyone in the same place, armoured or not (anyone at all, with nobody to win from).
const bettable = ({ board, view, player }: AbilityScene) => gambleTargets(board, view.players, player.id);

/** Aposta do Coringa: whom to bet against, or, with nobody in reach, the Lance da Sorte. */
export const cardGamble: AbilityFlow = {
  start: (scene) => (bettable(scene).length > 0 ? "picker" : null),
  Picker: ({ ctx }) => {
    // With nobody to win from, the die can be thrown for cards instead.
    const fortune =
      ctx.view.players.length > 1 && opponentsInReach(ctx.board, ctx.view.players, ctx.player.id).length === 0;
    return (
      <TargetPicker
        title="Aposta do Coringa"
        tone="text-rose-300"
        subtitle={
          fortune
            ? "Nenhum oponente ao seu alcance: aposte mesmo assim (perdendo, uma carta sua vai fora) ou tente o Lance da Sorte."
            : "Contra quem você aposta? Ganhando, rouba cartas dele; perdendo, ele leva uma sua."
        }
        alternatives={
          fortune
            ? [
                {
                  label: "Lance da Sorte",
                  detail: "o número do dado = cartas na mão",
                  onPick: () => ctx.use({ power: "fortune" }),
                },
              ]
            : []
        }
        targets={seated(ctx.view, bettable(ctx))}
        detail={(player) => (
          <>
            <Layers className="size-3.5" />
            {player.hand.length}
          </>
        )}
        onPick={(targetId) => ctx.use({ targetId })}
        onCancel={ctx.cancel}
      />
    );
  },
};
