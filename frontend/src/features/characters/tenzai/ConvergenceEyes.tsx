"use client";

import { Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Quaternion, Vector3, type Group, type Object3D } from "three";
import { CONVERGENCE } from "./palette";

const EYE_LIFT = 0.09;
const EYE_FORWARD = 0.1;
const EYE_SPREAD = 0.035;

/** The Convergence lights his eyes and the rune on his brow, following his head bone. */
export function ConvergenceEyes({ figure }: { figure: Object3D }) {
  const root = useRef<Group>(null);
  const head = useMemo(() => {
    let found: Object3D | null = null;
    figure.traverse((node) => {
      if (!found && /head$/i.test(node.name)) found = node;
    });
    return found as Object3D | null;
  }, [figure]);
  const at = useMemo(() => new Vector3(), []);
  const turn = useMemo(() => new Quaternion(), []);
  useFrame(() => {
    const group = root.current;
    if (!group || !head || !group.parent) return;
    head.getWorldPosition(at);
    figure.getWorldQuaternion(turn);
    group.parent.worldToLocal(at);
    group.position.copy(at);
    group.quaternion.copy(turn);
  });
  if (!head) return null;
  return (
    <group ref={root}>
      {[-EYE_SPREAD, EYE_SPREAD].map((x) => (
        <mesh key={x} position={[x, EYE_LIFT, EYE_FORWARD]}>
          <sphereGeometry args={[0.014, 8, 8]} />
          <meshBasicMaterial color="#e0ffff" toneMapped={false} />
        </mesh>
      ))}
      <mesh position={[0, EYE_LIFT + 0.065, EYE_FORWARD - 0.005]} rotation-z={Math.PI / 4}>
        <planeGeometry args={[0.035, 0.035]} />
        <meshBasicMaterial color={CONVERGENCE} toneMapped={false} side={2} />
      </mesh>
      <Sparkles
        count={6}
        scale={[0.25, 0.2, 0.25]}
        position={[0, EYE_LIFT, EYE_FORWARD]}
        size={4}
        color={CONVERGENCE}
      />
    </group>
  );
}
