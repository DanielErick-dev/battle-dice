"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from "three";
import { seededRandom } from "@/game/domain/random";
import { useCanvasTexture } from "../kit/textures";
import { CLUSTERS } from "./layout";
import { paintPetals } from "./textures";
import { useSoftDisc } from "../kit/matchAssets";

/** The fairy ring of glowing flowers round her feet, then a few more tucked at the crystals' feet. */
const RING_FLOWERS = 15;

const RING_RADIUS = 0.56;

const STRAYS_PER_CLUSTER = 3;

const FLOWER_TINTS = ["#9ff3ff", "#e0fbff", "#c9b8ff", "#7ee8fa"].map((hex) => new Color(hex));

/** Glowing flowers in three draws: stems, petal heads, and a glow over each that breathes in turn. */
export function Flowers() {
  const petals = useCanvasTexture({ size: 128, draw: paintPetals, linear: true });
  const disc = useSoftDisc();
  const parts = useMemo(() => {
    const random = seededRandom(89);
    const ring = Array.from({ length: RING_FLOWERS }, (_, index) => {
      const angle = (index / RING_FLOWERS) * Math.PI * 2 + (random() - 0.5) * 0.25;
      const radius = RING_RADIUS + (random() - 0.5) * 0.08;
      return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number];
    });
    const strays = CLUSTERS.flatMap(({ x, z }) =>
      Array.from({ length: STRAYS_PER_CLUSTER }, () => [x + (random() - 0.5) * 0.3, z + 0.08 + random() * 0.14]),
    ) as [number, number][];
    const flowers = [...ring, ...strays].map(([x, z]) => ({
      x,
      z,
      height: 0.035 + random() * 0.05,
      size: 0.035 + random() * 0.025,
      tint: FLOWER_TINTS[Math.floor(random() * FLOWER_TINTS.length)],
      tilt: (random() - 0.5) * 0.5,
      turn: random() * Math.PI * 2,
      phase: random() * Math.PI * 2,
    }));
    const count = flowers.length;
    const stemGeometry = new CylinderGeometry(0.003, 0.004, 1, 5);
    stemGeometry.translate(0, 0.5, 0);
    const stems = new InstancedMesh(stemGeometry, new MeshStandardMaterial({ color: "#4fa39a" }), count);
    const heads = new InstancedMesh(
      new PlaneGeometry(1, 1),
      new MeshBasicMaterial({ map: petals, transparent: true, depthWrite: false, side: DoubleSide, toneMapped: false }),
      count,
    );
    const dummy = new Object3D();
    flowers.forEach(({ x, z, height, size, tint, tilt, turn }, index) => {
      dummy.position.set(x, 0, z);
      dummy.rotation.set(0, 0, tilt * 0.5);
      dummy.scale.set(1, height, 1);
      dummy.updateMatrix();
      stems.setMatrixAt(index, dummy.matrix);
      dummy.position.set(x - Math.sin(tilt * 0.5) * height, height, z);
      dummy.rotation.set(-Math.PI / 2 + tilt, 0, turn);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
      heads.setColorAt(index, tint);
    });
    const glow = new BufferGeometry();
    glow.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(flowers.flatMap(({ x, z, height }) => [x, height + 0.005, z])), 3),
    );
    glow.setAttribute("color", new BufferAttribute(new Float32Array(count * 3), 3));
    return { flowers, stems, heads, glow };
  }, [petals]);
  useEffect(
    () => () => {
      for (const mesh of [parts.stems, parts.heads]) {
        mesh.geometry.dispose();
        (mesh.material as MeshBasicMaterial).dispose();
        mesh.dispose();
      }
      parts.glow.dispose();
    },
    [parts],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const colors = parts.glow.getAttribute("color") as BufferAttribute;
    parts.flowers.forEach(({ tint, phase }, index) => {
      const breath = 0.45 + 0.4 * Math.sin(t * 1.4 + phase);
      colors.setXYZ(index, tint.r * breath, tint.g * breath, tint.b * breath);
    });
    colors.needsUpdate = true;
  });

  return (
    <>
      <primitive object={parts.stems} />
      <primitive object={parts.heads} />
      <points geometry={parts.glow}>
        <pointsMaterial
          map={disc}
          vertexColors
          size={0.13}
          transparent
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </points>
    </>
  );
}
