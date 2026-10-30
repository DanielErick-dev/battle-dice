"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Euler, Quaternion, Vector3, type Group, type Object3D } from "three";
import { DEFAULT_TIMINGS } from "../../config";
import { preloadProps, PROP_HEIGHT, usePropMesh } from "./props";
import { findBone } from "./worldPlacement";

/** The bow's length from tip to tip, in model units (Meshy figures stand 1.7). */
const BOW_LENGTH = 1.05;
/** Slung across the back: from the upper spine, a little behind it, slanting from shoulder to hip. */
const ON_BACK = { offset: new Vector3(0, -0.02, -0.15), turn: new Euler(0, 0, 0.65) };
/** In the left hand: standing up, turned so its arc faces ahead, as if about to draw. */
const IN_HAND = { offset: new Vector3(0, 0.02, 0.04), turn: new Euler(0, Math.PI / 2, 0.12) };
/** Drawn for the aim and the whole volley (see the arrowsLoosed playback), then slung back. */
const DRAWN_SECONDS = (DEFAULT_TIMINGS.arrowAimMs + DEFAULT_TIMINGS.arrowVolleyMs) / 1000 + 0.4;
/** How quickly it moves between the back and the hand (per second). */
const DRAW_RATE = 7;
const HIDE_RATE = 5;

preloadProps(["elvenBow"]);

/**
 * The Elven Archer's bow (PROPS.elvenBow): slung on her back during the match, drawn into her left
 * hand when she uses her ability (each new `cast` id) and slung back once the volley is over. Folds
 * away while she sits (it would go through the throne). Mounted inside the figure (its own frame).
 */
export function BackBow({
  figure,
  cast,
  seated,
}: {
  figure: Object3D;
  cast: number | null;
  seated: RefObject<boolean>;
}) {
  const { geometry, material } = usePropMesh("elvenBow");
  const bones = useMemo(() => ({ spine: findBone(figure, "Spine2"), hand: findBone(figure, "LeftHand") }), [figure]);
  const root = useRef<Group>(null);
  const lastCast = useRef<number | null>(cast);
  const drawnAt = useRef<number | null>(null);
  /** 0 on the back, 1 in the hand. */
  const drawn = useRef(0);
  const shown = useRef(1);
  const scratch = useMemo(
    () => ({
      back: new Vector3(),
      hand: new Vector3(),
      backTurn: new Quaternion().setFromEuler(ON_BACK.turn),
      handTurn: new Quaternion().setFromEuler(IN_HAND.turn),
    }),
    [],
  );

  useFrame(({ clock }, delta) => {
    const node = root.current;
    if (!node || !bones.spine || !bones.hand) return;
    const now = clock.elapsedTime;
    if (cast !== lastCast.current) {
      lastCast.current = cast;
      if (cast !== null) drawnAt.current = now;
    }
    const drawing = drawnAt.current !== null && now - drawnAt.current < DRAWN_SECONDS;
    drawn.current += ((drawing ? 1 : 0) - drawn.current) * (1 - Math.exp(-DRAW_RATE * delta));
    shown.current += ((seated.current ? 0 : 1) - shown.current) * (1 - Math.exp(-HIDE_RATE * delta));
    node.visible = shown.current > 0.02;
    if (!node.visible) return;

    const { back, hand, backTurn, handTurn } = scratch;
    figure.worldToLocal(bones.spine.getWorldPosition(back)).add(ON_BACK.offset);
    figure.worldToLocal(bones.hand.getWorldPosition(hand)).add(IN_HAND.offset);
    node.position.lerpVectors(back, hand, drawn.current);
    node.quaternion.slerpQuaternions(backTurn, handTurn, drawn.current);
    node.scale.setScalar((BOW_LENGTH / PROP_HEIGHT) * shown.current);
  });

  if (!bones.spine || !bones.hand) return null;
  return (
    <group ref={root}>
      <mesh geometry={geometry} material={material} castShadow />
    </group>
  );
}
