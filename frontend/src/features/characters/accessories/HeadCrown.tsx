"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Matrix4, Quaternion, Vector3, type Group, type Object3D, type SkinnedMesh } from "three";
import { preloadProps, PROP_HEIGHT, usePropMesh, type PropId } from "../core/props";
import { findBone } from "../core/bones";

/** A crown worn on the head: which model, how big, and where it sits on the skull. */
interface CrownLook {
  prop: PropId;
  /** Its longest side (front to back), in model units (Meshy figures stand 1.7). */
  size: number;
  /** Where its middle sits from the top of the head, in the head's frame (+y up the head, +z ahead). */
  offset: [number, number, number];
}

const CROWNS = {
  // Seraphiel's white winged crown, its wings at the front.
  seraph: { prop: "seraphCrown", size: 0.21, offset: [0, -0.025, -0.005] },
  // His crown of black-red thorns once fallen: a slimmer band, sitting lower.
  fallen: { prop: "fallenCrown", size: 0.2, offset: [0, -0.035, -0.005] },
} as const satisfies Record<string, CrownLook>;
export type CrownId = keyof typeof CROWNS;

preloadProps(Object.values(CROWNS).map(({ prop }) => prop));

/**
 * A crown on a figure's head (a Meshy prop): it follows the head bone, tilting with it. The bone
 * leans a little at rest (Mixamo's head points slightly forward), so only its turn away from the
 * bind pose is applied, and the crown stands level while the figure does.
 * Mounted inside the figure (its own frame, in model units).
 */
export function HeadCrown({ figure, crown }: { figure: Object3D; crown: CrownId }) {
  const look: CrownLook = CROWNS[crown];
  const { geometry, material } = usePropMesh(look.prop);
  const bones = useMemo(() => {
    const head = findBone(figure, "Head");
    const top = findBone(figure, "HeadTop_End");
    if (!head || !top) return null;
    // The head's bind orientation, from the skin that binds it.
    const unbind = new Quaternion();
    figure.traverse((node) => {
      const skin = node as SkinnedMesh;
      const index = skin.isSkinnedMesh ? skin.skeleton.bones.indexOf(head as never) : -1;
      if (index < 0) return;
      const bind = skin.skeleton.boneInverses[index].clone().invert();
      bind.decompose(new Vector3(), unbind, new Vector3());
      unbind.invert();
    });
    return { head, top, unbind };
  }, [figure]);

  const root = useRef<Group>(null);
  const scratch = useMemo(
    () => ({ matrix: new Matrix4(), turn: new Quaternion(), place: new Vector3(), lift: new Vector3() }),
    [],
  );
  const offset = useMemo(() => new Vector3(...look.offset), [look.offset]);

  useFrame(() => {
    if (!root.current || !bones) return;
    const { matrix, turn, place, lift } = scratch;
    matrix.copy(figure.matrixWorld).invert().multiply(bones.head.matrixWorld);
    matrix.decompose(place, turn, lift);
    turn.multiply(bones.unbind);
    root.current.quaternion.copy(turn);
    root.current.position.copy(figure.worldToLocal(bones.top.getWorldPosition(place)));
    root.current.position.add(lift.copy(offset).applyQuaternion(turn));
  });

  if (!bones) return null;
  return (
    <group ref={root}>
      <mesh geometry={geometry} material={material} scale={look.size / PROP_HEIGHT} />
    </group>
  );
}
