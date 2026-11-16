"use client";

import { Sparkles, Trail } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh, type Object3D } from "three";
import type { Element } from "@/game/domain/types";
import { useAge } from "@/features/shared/three/useAge";
import { PropCharm } from "./ElementCharms";
import { handUnit, InHand } from "../core/inHand";
import { ELEMENT_COLOR } from "./palette";

/** How long his hands trail the element after the bending starts. */
const TRAIL_SECONDS = 2.4;

/** The element streaming off both hands while he bends it: fire, water, a gust or dust. */
export function HandTrails({ figure, element }: { figure: Object3D; element: Element }) {
  const hands = useMemo(() => {
    const found: Object3D[] = [];
    figure.traverse((node) => {
      if (/(left|right)hand$/i.test(node.name)) found.push(node);
    });
    return found;
  }, [figure]);
  return (
    <>
      {hands.map((hand) => (
        <HandTrail key={hand.uuid} hand={hand} color={ELEMENT_COLOR[element]} element={element} />
      ))}
      {(["LeftHand", "RightHand"] as const).map((bone) => (
        <InHand key={bone} figure={figure} bone={bone}>
          {(hand) => <HandElement hand={hand} figure={figure} element={element} />}
        </InHand>
      ))}
    </>
  );
}

/** The element itself held in a hand while he bends: flames, a ring of water, orbiting stones, a whirl of wind. */
function HandElement({ hand, figure, element }: { hand: Object3D; figure: Object3D; element: Element }) {
  const root = useRef<Group>(null);
  const spin = useRef<Group>(null);
  const scratch = useMemo(() => ({ hand: new Vector3(), figure: new Vector3() }), []);
  const age = useAge();
  useFrame(({ clock }, delta) => {
    const node = root.current;
    if (!node) return;
    const t = age(clock.elapsedTime);
    node.visible = t < TRAIL_SECONDS;
    const grow = Math.min(1, t / 0.3) * Math.min(1, (TRAIL_SECONDS - t) / 0.4);
    node.scale.setScalar(handUnit(hand, figure, scratch) * Math.max(0.001, grow));
    if (spin.current) spin.current.rotation.y += delta * (element === "wind" ? 9 : 3);
  });
  const color = ELEMENT_COLOR[element];
  return (
    <group ref={root}>
      {element === "fire" && (
        <>
          <group position-y={0.12}>
            <PropCharm id="tenzaiFlame" height={0.3} glow={1.2} />
          </group>
          <Sparkles count={10} scale={0.35} size={3} speed={2} color="#ffb347" />
        </>
      )}
      {element === "water" && (
        <group ref={spin}>
          <mesh rotation-x={Math.PI / 2}>
            <torusGeometry args={[0.13, 0.025, 8, 24]} />
            <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.75} />
          </mesh>
          <Sparkles count={14} scale={0.4} size={2.5} speed={1.5} color="#e0f2fe" />
        </group>
      )}
      {element === "earth" && (
        <group ref={spin}>
          {[0, 1, 2].map((index) => (
            <group
              key={index}
              position={[
                Math.cos((index * Math.PI * 2) / 3) * 0.14,
                0.03 * index,
                Math.sin((index * Math.PI * 2) / 3) * 0.14,
              ]}
            >
              <PropCharm id="tenzaiBoulder" height={0.08} />
            </group>
          ))}
          <Sparkles count={10} scale={0.4} size={2} speed={0.8} color="#d6b37a" />
        </group>
      )}
      {element === "wind" && (
        <group ref={spin}>
          {[0.1, 0.15, 0.2].map((radius, index) => (
            <mesh key={radius} rotation-x={Math.PI / 2} position-y={index * 0.04}>
              <torusGeometry args={[radius, 0.008, 6, 28, Math.PI * 1.4]} />
              <meshBasicMaterial color={color} transparent opacity={0.7} toneMapped={false} />
            </mesh>
          ))}
          <Sparkles count={12} scale={0.5} size={2.5} speed={3} color={color} />
        </group>
      )}
    </group>
  );
}

function HandTrail({ hand, color, element }: { hand: Object3D; color: string; element: Element }) {
  const tip = useRef<Mesh>(null);
  const at = useMemo(() => new Vector3(), []);
  const age = useAge();
  useFrame(({ clock }) => {
    const mesh = tip.current;
    if (!mesh?.parent) return;
    hand.getWorldPosition(at);
    mesh.parent.worldToLocal(at);
    mesh.position.copy(at);
    mesh.visible = age(clock.elapsedTime) < TRAIL_SECONDS;
  });
  return (
    <>
      <Trail
        width={element === "fire" ? 0.9 : 0.6}
        length={element === "wind" ? 7 : 5}
        color={color}
        attenuation={(t) => t * t}
      >
        <mesh ref={tip}>
          <sphereGeometry args={[element === "fire" ? 0.06 : 0.04, 8, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </Trail>
    </>
  );
}
