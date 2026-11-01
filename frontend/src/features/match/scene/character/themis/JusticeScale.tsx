"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Quaternion, Vector3, type Group, type Object3D } from "three";
import { figureTurnInHand, handUnit, InHand } from "../core/inHand";
import { preloadProps, Prop, usePropMesh } from "../core/props";

/** In model units (Meshy figures stand 1.7): the scales hang this tall from the fingers. */
const SCALE_HEIGHT = 0.38;
/** Share of the height above the middle where the fingers close round the pole (just under the beam). */
const GRIP = 0.12;
/** Held out from the body (model units, away from the figure's middle), so the arm down doesn't sink them into the leg. */
const HELD_OUT = 0.1;

preloadProps(["justiceScale"]);

/**
 * Themis's scales of justice (PROPS.justiceScale), gripped by the pole in her left hand (her right holds the sword).
 * They stay upright whatever the hand does, as a hanging balance would, facing the way she does.
 */
export function JusticeScale({ figure }: { figure: Object3D }) {
  return (
    <InHand figure={figure} bone="LeftHand">
      {(hand) => <Hanging figure={figure} hand={hand} />}
    </InHand>
  );
}

function Hanging({ figure, hand }: { figure: Object3D; hand: Object3D }) {
  const { geometry, material } = usePropMesh("justiceScale");
  const group = useRef<Group>(null);
  const scratch = useMemo(
    () => ({
      scales: { hand: new Vector3(), figure: new Vector3() },
      figureTurn: new Quaternion(),
      spot: new Vector3(),
    }),
    [],
  );

  useFrame(() => {
    const node = group.current;
    if (!node) return;
    node.scale.setScalar(handUnit(hand, figure, scratch.scales));
    // At the hand, pushed out sideways from the body in the figure's own frame.
    const spot = figure.worldToLocal(hand.getWorldPosition(scratch.spot));
    spot.x += Math.sign(spot.x) * HELD_OUT;
    node.position.copy(hand.worldToLocal(figure.localToWorld(spot)));
    figureTurnInHand(hand, figure, node.quaternion, scratch.figureTurn);
  });

  return (
    <group ref={group}>
      <group position-y={-SCALE_HEIGHT * GRIP}>
        <Prop geometry={geometry} material={material} height={SCALE_HEIGHT} />
      </group>
    </group>
  );
}
