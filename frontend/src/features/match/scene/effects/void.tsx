/** Zarek, the Void Knight: his blades of light, smashed traps, the rifts his Void opens and the Void itself. */
import { useMemo } from "react";
import type { Object3D } from "three";
import { TILE_HEIGHT, type Vec3 } from "../boardLayout";
import { EnergyBlades } from "../character/zarek/EnergyBlades";
import { RiftMaw } from "../character/zarek/RiftMaw";
import { VoidSurge } from "../character/zarek/VoidSurge";
import { VoidWraith } from "../character/zarek/VoidWraith";
import { SmashedTrapMark } from "../TrapSmash";
import type { BoardFx, TokenFx } from "./types";

/** The Void is black. */
const SMASHED_TRAP_COLOR = "#18181b";

/** In his hands while the cast clip plays: his modelled swords can't move. */
export function LightBlades({ token, figure }: { token: TokenFx; figure: Object3D }) {
  return (
    token.character?.energyBlades && <EnergyBlades figure={figure} color={token.color} active={token.live.bladesOut} />
  );
}

export function SmashedTraps({ fx: { view, layout, shown } }: { fx: BoardFx }) {
  return view.destroyedTraps
    .filter(shown)
    .map((tile) => (
      <SmashedTrapMark key={`smashed${tile}`} tile={tile} position={layout.position(tile)} color={SMASHED_TRAP_COLOR} />
    ));
}

/** Rifts, the purple traps the Void marked, and its seal on every spell Zarek let out. */
export function Rifts({ fx: { view, layout } }: { fx: BoardFx }) {
  const voids = new Set(view.players.filter((player) => player.ability === "theVoid").map((player) => player.id));
  const released = [...view.blackFlames, ...view.enchantedTiles, ...view.seals, ...view.specters]
    .filter((spell) => voids.has(spell.owner))
    .map((spell) => spell.tile);
  const scars = view.voidScars.map((scar) => scar.tile);
  const tiles = [...new Set([...view.rifts.map((tile) => tile.id), ...scars, ...released])];
  return tiles.map((tile) => <RiftMaw key={`rift${tile}`} position={layout.position(tile)} />);
}

/** The Void opening on a tile: swallowing pulls in, setting down or opening pours out. */
export function VoidAtWork({ fx: { view, layout } }: { fx: BoardFx }) {
  const rift = view.fx.voidRift;
  if (!rift) return null;
  return (
    <VoidSurge
      key={`void${rift.id}`}
      position={layout.position(rift.tile)}
      inward={rift.action === "swallow" || rift.action === "seize"}
    />
  );
}

/** Only on boards where Zarek plays. */
export function TheVoid({ fx: { view, board, layout } }: { fx: BoardFx }) {
  const present = view.players.some((player) => player.ability === "theVoid");
  const roam = useMemo(
    () => board.tiles.filter((tile) => !tile.track && tile.role === "regular").map((tile) => layout.position(tile.id)),
    [board, layout],
  );
  const rift = view.fx.voidRift;
  const call = useMemo(() => {
    if (!rift) return null;
    const [x, y, z] = layout.position(rift.tile);
    const at: Vec3 = [x, y + TILE_HEIGHT / 2, z];
    return { id: rift.id, at };
  }, [rift, layout]);
  return present && <VoidWraith roam={roam} call={call} />;
}
