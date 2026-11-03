"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Quaternion, Vector3, type Group } from "three";
import { createFlameGeometry, createFlameMaterial, setUniforms } from "./flameShader";

const UP = new Vector3(0, 1, 0);

/**
 * One live flame (see flameShader), `width` wide with its foot at `position`, standing upright in the world and turned
 * to the camera. `seed` keeps neighbouring flames from licking in step; `glow` brightens it.
 */
export function FlameCard({
  width,
  position = [0, 0, 0],
  seed = 0,
  glow = 1,
}: {
  width: number;
  position?: readonly [number, number, number];
  seed?: number;
  glow?: number;
}) {
  const group = useRef<Group>(null);
  const flame = useMemo(() => ({ geometry: createFlameGeometry(), material: createFlameMaterial() }), []);
  const scratch = useMemo(() => ({ at: new Vector3(), parent: new Quaternion(), facing: new Quaternion() }), []);

  useEffect(
    () => () => {
      flame.geometry.dispose();
      flame.material.dispose();
    },
    [flame],
  );

  useFrame(({ clock, camera }) => {
    const node = group.current;
    if (!node?.parent) return;
    node.getWorldPosition(scratch.at);
    scratch.facing.setFromAxisAngle(UP, Math.atan2(camera.position.x - scratch.at.x, camera.position.z - scratch.at.z));
    node.parent.getWorldQuaternion(scratch.parent);
    node.quaternion.copy(scratch.parent.invert().multiply(scratch.facing));
    setUniforms(flame.material, { uTime: clock.elapsedTime + seed * 17.3, uGlow: glow });
  });

  return (
    <group ref={group} position={position as [number, number, number]} scale={width}>
      <mesh geometry={flame.geometry} material={flame.material} renderOrder={2} />
    </group>
  );
}
