/** Shadow Warden: his apparitions on the board. */
import { characterFor } from "../../characters";
import { SPECTER_TEXT } from "../../ui/placementText";
import { SpecterFigure } from "../character/SpecterFigure";
import { headingAlong, pathDirection } from "../tokenPlacement";
import type { BoardFx } from "./types";

/** Only their owner sees what each one is; to everyone else they look just like the Warden. */
export function Apparitions({ fx: { view, board, layout, viewerId, shown } }: { fx: BoardFx }) {
  return view.specters
    .filter((specter) => shown(specter.tile))
    .map((specter) => {
      const warden = characterFor(specter.owner);
      return warden ? (
        <SpecterFigure
          key={`${specter.owner}:${specter.tile}`}
          model={warden.model}
          position={layout.position(specter.tile)}
          color={warden.color}
          disguised={specter.owner !== viewerId}
          facing={headingAlong(pathDirection(board, layout, specter.tile))}
          label={specter.owner === viewerId ? SPECTER_TEXT[specter.kind].name : undefined}
        />
      ) : null;
    });
}
