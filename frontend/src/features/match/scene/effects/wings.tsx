/** Wings on the back (Crystal Fairy, Seraphiel) and crowns on the head (the angels): the models are made without them. */
import type { Object3D } from "three";
import { isFallen } from "@/game/domain/seraph";
import { HeadCrown } from "../character/accessories/HeadCrown";
import { Wings } from "../character/accessories/Wings";
import type { TokenFx } from "./types";

export function BackWings({ token, figure }: { token: TokenFx; figure: Object3D }) {
  // Seraphiel's burn once he has fallen.
  const wings = isFallen(token.player) ? token.character?.fallenWings : token.character?.wings;
  return wings && <Wings figure={figure} wings={wings} folded={token.live.seated} />;
}

export function WornCrown({ token, figure }: { token: TokenFx; figure: Object3D }) {
  const crown = isFallen(token.player) ? token.character?.fallenCrown : token.character?.crown;
  return crown && <HeadCrown figure={figure} crown={crown} />;
}
