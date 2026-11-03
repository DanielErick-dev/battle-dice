"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BoxGeometry, EdgesGeometry, type Group } from "three";
import { FlameCard } from "./FlameCard";

const DIE = 0.17;

/** Pure Fuel: two burning dice tumbling round Akane's head until his doubled rolls are spent (aura units). */
export function FuelDice() {
  const orbit = useRef<Group>(null);
  const dice = useRef<(Group | null)[]>([]);
  const shapes = useMemo(() => {
    const box = new BoxGeometry(DIE, DIE, DIE);
    return { box, edges: new EdgesGeometry(box) };
  }, []);
  useEffect(
    () => () => {
      shapes.box.dispose();
      shapes.edges.dispose();
    },
    [shapes],
  );

  useFrame(({ clock }, delta) => {
    if (orbit.current) orbit.current.rotation.y += delta * 0.9;
    dice.current.forEach((die, index) => {
      if (!die) return;
      die.rotation.x += delta * (1.3 + index * 0.4);
      die.rotation.z += delta * (0.9 - index * 0.3);
      die.position.y = Math.sin(clock.elapsedTime * 2 + index * Math.PI) * 0.06;
    });
  });

  return (
    <group ref={orbit} position-y={1.75}>
      {[0, Math.PI].map((angle, index) => (
        <group key={index} position={[Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5]}>
          <group
            ref={(die) => {
              dice.current[index] = die;
            }}
          >
            <mesh geometry={shapes.box}>
              <meshStandardMaterial color="#1a0805" emissive="#ff3a0a" emissiveIntensity={0.7} roughness={0.8} />
            </mesh>
            <lineSegments geometry={shapes.edges}>
              <lineBasicMaterial color="#ffb347" toneMapped={false} />
            </lineSegments>
          </group>
          <FlameCard width={0.2} position={[0, -DIE * 0.6, 0]} seed={index * 6.1} glow={1.3} />
        </group>
      ))}
    </group>
  );
}
