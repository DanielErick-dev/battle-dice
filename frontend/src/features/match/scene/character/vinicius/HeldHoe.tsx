"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { Matrix4, Quaternion, Vector3, type Group, type Object3D } from "three";
import { figureTurnInHand, handUnit, InHand } from "../core/inHand";
import { preloadProps, Prop, usePropMesh } from "../core/props";

/** The hoe's length in model units (he stands 1.7): short enough to stand under his hanging hand. */
const HOE_LENGTH = 0.85;
/** The export's half length, along its x (PROP_HEIGHT units). */
const HALF = 0.95;
/** The export lies along x, blade at -x hanging to -y: gripped near the handle's top (+x) end. */
const GRIP_X = 0.7;
/** The fist, in the hand bone's frame (Mixamo: +y along the fingers). */
const HOLD = new Vector3(-0.025, 0.06, 0);
/** Its axes in the figure's frame (+z ahead): the handle's top end (export +x) up, the blade (export -y) out that way. */
const basis = (handleUp: Vector3, bladeOut: Vector3) =>
  new Quaternion().setFromRotationMatrix(
    new Matrix4().makeBasis(
      handleUp,
      bladeOut.clone().negate(),
      new Vector3().crossVectors(handleUp, bladeOut.clone().negate()),
    ),
  );
/** Chopping: the blade faces ahead. */
const CHOPPING = basis(new Vector3(0, 1, 0), new Vector3(0, 0, 1));
/** Stood in the soil on the menu: the blade facing out to his right (seen edge-on from ahead), the top leaning in to him. */
const STANDING = new Quaternion()
  .setFromAxisAngle(new Vector3(0, 0, 1), -0.08)
  .multiply(basis(new Vector3(0, 1, 0), new Vector3(-1, 0, 0)));
/** Where the handle's top stands on the menu, in his model units: just outside his hanging right hand (measured). */
const PLANTED_TOP = new Vector3(-0.33, 0.86, 0.07);
const PITCH = new Vector3(1, 0, 0);
/** A chop: seconds for each blow, how many, where the blade bites the ground ahead and how far up it's raised from there. */
const CHOP_SECONDS = 0.34;
const CHOPS = 3;
const CHOP_BITE = 0.6;
const CHOP_RAISE = 1.6;
/** Seconds for the hoe to appear before the first blow and to go after the last (in the match). */
const SHOW_SECONDS = 0.2;

preloadProps(["viniciusHoe"]);

/**
 * Vinicius's hoe (PROPS.viniciusHoe) in the match: out in his right fist only to hack at the ground ahead a few times
 * with each new `chop` id (he weeds out a trap), then gone.
 */
export function HeldHoe({ figure, chop }: { figure: Object3D; chop: number | null }) {
  const { geometry, material } = usePropMesh("viniciusHoe");
  return (
    <InHand figure={figure} bone="RightHand">
      {(hand) => (
        <Grip figure={figure} hand={hand} chop={chop}>
          <Prop geometry={geometry} material={material} height={HOE_LENGTH} />
        </Grip>
      )}
    </InHand>
  );
}

function Grip({
  figure,
  hand,
  chop,
  children,
}: {
  figure: Object3D;
  hand: Object3D;
  chop: number | null;
  children: ReactNode;
}) {
  const group = useRef<Group>(null);
  const swing = useRef<Group>(null);
  const scratch = useMemo(
    () => ({
      hand: new Vector3(),
      figure: new Vector3(),
      turn: new Quaternion(),
      spare: new Quaternion(),
      swing: new Quaternion(),
    }),
    [],
  );
  const chopping = useRef<{ id: number | null; since: number | null }>({ id: chop, since: null });

  useFrame(({ clock }) => {
    const node = group.current;
    if (!node) return;
    const state = chopping.current;
    if (chop !== state.id) {
      state.id = chop;
      state.since = chop === null ? null : clock.elapsedTime;
    }
    const elapsed = state.since === null ? Infinity : clock.elapsedTime - state.since - SHOW_SECONDS;
    const busy = CHOPS * CHOP_SECONDS;
    const shown = Math.min(
      1,
      Math.max(0, Math.min(elapsed + SHOW_SECONDS, busy + SHOW_SECONDS - elapsed) / SHOW_SECONDS),
    );
    node.visible = shown > 0;
    if (!node.visible) return;
    const unit = handUnit(hand, figure, scratch) * shown;
    node.scale.setScalar(unit);
    node.position.copy(HOLD).multiplyScalar(unit);
    const blow = elapsed / CHOP_SECONDS;
    // Swung up ahead of him, then brought down hard so the blade bites the ground in front.
    const angle = blow >= 0 && blow < CHOPS ? -CHOP_BITE - CHOP_RAISE * Math.sin((blow % 1) * Math.PI) ** 0.6 : 0;
    // Held level in the figure's frame, the chop pitching it round his side, not round the hand bone's own axes.
    figureTurnInHand(hand, figure, scratch.turn, scratch.spare);
    scratch.swing.setFromAxisAngle(PITCH, angle);
    swing.current?.quaternion.copy(scratch.turn).multiply(scratch.swing).multiply(CHOPPING);
  });

  return (
    <group ref={group}>
      <group ref={swing}>
        <group position-x={(-GRIP_X * HOE_LENGTH) / (2 * HALF)}>{children}</group>
      </group>
    </group>
  );
}

/**
 * On the menu: the hoe stood in the soil at his right side, its handle's top under his open hand (his model's hand
 * can't close round it). In his frame, `size` tall, standing on the floor.
 */
export function PlantedHoe({ size }: { size: number }) {
  const { geometry, material } = usePropMesh("viniciusHoe");
  const unit = size / 1.7;
  return (
    <group position={PLANTED_TOP.clone().multiplyScalar(unit)} quaternion={STANDING} scale={unit}>
      {/* Hung from its top end. */}
      <group position-x={-HOE_LENGTH / 2}>
        <Prop geometry={geometry} material={material} height={HOE_LENGTH} />
      </group>
    </group>
  );
}
