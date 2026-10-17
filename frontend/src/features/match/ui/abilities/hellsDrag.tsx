import { dragTargets } from "@/game/domain/seraph";
import { TargetPicker } from "../hud/TargetPicker";
import { seated } from "./seated";
import type { AbilityFlow, AbilityScene } from "./types";

// Hell's Drag reaches any opponent on the board not in heaven or hell already; armoured ones turn it away.
const draggable = ({ board, view, player }: AbilityScene) => dragTargets(board, view.players, player.id);

/** Arrastar ao Inferno: the opponent the hand from hell pulls down. */
export const hellsDrag: AbilityFlow = {
  start: (scene) => (draggable(scene).length > 0 ? "picker" : null),
  Picker: ({ ctx }) => (
    <TargetPicker
      title="Arrastar ao Inferno"
      tone="text-red-500"
      subtitle="Quem a mão do inferno vai buscar?"
      targets={seated(ctx.view, draggable(ctx))}
      detail={(player) => <span className="font-mono">{player.position}</span>}
      onPick={(targetId) => ctx.use({ targetId })}
      onCancel={ctx.cancel}
    />
  ),
};
