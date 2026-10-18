/** Wings on the back (Crystal Fairy, Seraphiel): the models are made without them. */
import type { Object3D } from "three";
import { isFallen } from "@/game/domain/seraph";
import { Wings } from "../character/Wings";
import type { TokenFx } from "./types";

export function BackWings({ token, figure }: { token: TokenFx; figure: Object3D }) {
  // Seraphiel's burn once he has fallen.
  const wings = isFallen(token.player) ? token.character?.fallenWings : token.character?.wings;
  return wings && <Wings figure={figure} wings={wings} folded={token.live.seated} />;
}
