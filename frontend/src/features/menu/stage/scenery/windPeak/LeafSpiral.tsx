"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, InstancedMesh, MeshStandardMaterial, Object3D, PlaneGeometry } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { useCanvasTexture } from "../kit/textures";
import { HALF_WIDTH } from "./layout";
import { paintLeaf } from "./textures";

const LEAVES = 30;

const LEAF_HEIGHT = 2;

const LEAF_TINTS = ["#86efac", "#4ade80", "#a3e635", "#d9f99d", "#65a30d"].map((hex) => new Color(hex));

/** Leaves carried up round him in a widening funnel, tumbling: one instanced draw. */
export function LeafSpiral() {
  const texture = useCanvasTexture({ size: 64, height: 40, draw: paintLeaf, linear: true });
  const { mesh, leaves } = useMemo(() => {
    const random = seededRandom(113);
    const geometry = new PlaneGeometry(0.05, 0.03);
    const material = new MeshStandardMaterial({ map: texture, alphaTest: 0.5, side: DoubleSide, roughness: 0.8 });
    const mesh = new InstancedMesh(geometry, material, LEAVES);
    const leaves = Array.from({ length: LEAVES }, (_, index) => {
      mesh.setColorAt(index, LEAF_TINTS[index % LEAF_TINTS.length]);
      return {
        angle: random() * Math.PI * 2,
        height: random() * LEAF_HEIGHT,
        rise: 0.18 + random() * 0.16,
        spin: 0.9 + random() * 0.6,
        inner: 0.3 + random() * 0.15,
        tumble: [random() * 3, random() * 3, random() * 3],
        size: 0.7 + random() * 0.6,
      };
    });
    return { mesh, leaves };
  }, [texture]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  const dummy = useMemo(() => new Object3D(), []);
  const instances = useRef<InstancedMesh>(null);

  useFrame(({ clock }, delta) => {
    const leafMesh = instances.current;
    if (!leafMesh) return;
    const t = clock.elapsedTime;
    leaves.forEach((leaf, index) => {
      leaf.height += leaf.rise * delta;
      leaf.angle += leaf.spin * delta;
      if (leaf.height > LEAF_HEIGHT) leaf.height -= LEAF_HEIGHT;
      const radius = leaf.inner + leaf.height * 0.22;
      const x = Math.max(-HALF_WIDTH, Math.min(HALF_WIDTH, Math.cos(leaf.angle) * radius));
      dummy.position.set(x, leaf.height, Math.sin(leaf.angle) * radius);
      dummy.rotation.set(t * leaf.tumble[0], t * leaf.tumble[1], t * leaf.tumble[2]);
      // Grows in from the ground and shrinks away at the top, so the loop is not seen.
      dummy.scale.setScalar(leaf.size * Math.min(1, leaf.height * 4, (LEAF_HEIGHT - leaf.height) * 2));
      dummy.updateMatrix();
      leafMesh.setMatrixAt(index, dummy.matrix);
    });
    leafMesh.instanceMatrix.needsUpdate = true;
  });

  return <primitive ref={instances} object={mesh} />;
}
