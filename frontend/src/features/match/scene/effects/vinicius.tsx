/** Vinicius: the hoe that comes out to hack at each trap he weeds out. */
import type { Object3D } from "three";
import { HeldHoe } from "../character/vinicius/HeldHoe";
import type { TokenFx } from "./types";

export function Hoe({ token, figure }: { token: TokenFx; figure: Object3D }) {
  // Snowed in up to the hands, the hoe would poke out of the snow.
  const buried = (token.player.snowbound?.rounds ?? 0) >= 2;
  return token.character?.holdsHoe && !buried && <HeldHoe figure={figure} chop={token.weeded} />;
}
