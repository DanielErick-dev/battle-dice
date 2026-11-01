/** Themis: the scales in her hand and the Silent Verdict's giant one. */
import type { Object3D } from "three";
import { TILE_HEIGHT } from "../boardLayout";
import { EFFECT_SCALE } from "../character/core/figure";
import { JusticeScale } from "../character/themis/JusticeScale";
import { VerdictScale } from "../character/themis/VerdictScale";
import type { BoardFx, TokenFx } from "./types";

export function HeldScale({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return token.character?.holdsScale && <JusticeScale figure={figure} />;
}

/** Stands between the judge and the one judged, its arm pointing at them. */
export function Verdict({ fx: { view, layout } }: { fx: BoardFx }) {
  const verdict = view.fx.verdict;
  if (!verdict) return null;
  const tileOf = (id: string) => view.players.find((player) => player.id === id)?.position ?? 0;
  const [jx, y, jz] = layout.position(tileOf(verdict.judgeId));
  const [ax, , az] = layout.position(tileOf(verdict.attackerId));
  const span = Math.hypot(ax - jx, az - jz);
  return (
    <group
      key={`verdict${verdict.id}`}
      position={[(jx + ax) / 2, y + TILE_HEIGHT / 2, (jz + az) / 2]}
      rotation={[0, span > 0 ? Math.atan2(-(az - jz), ax - jx) : 0, 0]}
      scale={EFFECT_SCALE}
    >
      <VerdictScale span={span / EFFECT_SCALE} phase={verdict.phase} />
    </group>
  );
}
