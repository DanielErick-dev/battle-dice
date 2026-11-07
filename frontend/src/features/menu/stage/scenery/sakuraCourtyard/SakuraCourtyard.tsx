"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { DoubleSide, MeshStandardMaterial, type Group } from "three";
import { GROUND_RADIUS } from "../kit/geometry";
import { usePropMesh } from "../kit/matchAssets";
import { useCanvasTexture } from "../kit/textures";
import { FallingPetals, type Crown } from "./FallingPetals";
import { Notebook } from "./Notebook";
import { NOTEBOOK_SIZE } from "./layout";
import { paintCourtyardFloor, paintNotebookPage } from "./textures";
import { Courtyard, StoneLantern } from "./CourtyardPieces";
import { SmoulderingCorner } from "./SmoulderingPage";
import { SnapFires } from "./SnapFires";
import { CHARACTERS } from "@/features/characters";
import type { SceneryProps } from "..";

/** The petals in the air all catch at the snap of his fingers in his intro. */
const SNAP_SECONDS = CHARACTERS.akane.introChair?.snapSeconds ?? 0;

/** His own Meshy tree (ember blossoms on a trunk veined with magma, 2 tall in its export), one at each back corner. */
const TREES = [
  // Inside the courtyard's rim (its paving reaches about 0.95 out), roots on the stone.
  { x: -0.7, z: -0.55, height: 2.4, turn: 0.4, sway: 0 },
  { x: 0.7, z: -0.55, height: 2.25, turn: 2.6, sway: 1.7 },
];
/** The crown of each, where its petals fall from: tall and narrow, centred about 0.75 of the way up. */
const CROWNS: readonly Crown[] = TREES.map(({ x, z, height }) => ({ x, y: height * 0.75, z, radius: height * 0.22 }));

/**
 * Akane's stage: a stone courtyard ringed by lanterns at dusk, under two ember-blossom trees, notebooks and a garden lantern. His fire is in the air:
 * the falling petals burn away as embers, a live flame burns in the lantern and the loose pages smoulder.
 */
export function SakuraCourtyard({ intro }: SceneryProps) {
  const paving = useCanvasTexture({ size: 512, draw: paintCourtyardFloor, seed: 29, fadeFrom: 0.3 });
  const treeMesh = usePropMesh("akaneTree");
  const page = useCanvasTexture({ size: 128, draw: paintNotebookPage, seed: 7 });
  const materials = useMemo(
    () => ({
      floor: new MeshStandardMaterial({ map: paving, transparent: true, roughness: 0.95, depthWrite: false }),
      page: new MeshStandardMaterial({ map: page, roughness: 0.9, side: DoubleSide }),
      paper: new MeshStandardMaterial({ color: "#efe9dc", roughness: 0.9 }),
      covers: ["#f4a6c6", "#9cc3e8", "#c7b3e6"].map((color) => new MeshStandardMaterial({ color, roughness: 0.7 })),
      pencil: new MeshStandardMaterial({ color: "#f2c14e", roughness: 0.6 }),
      lead: new MeshStandardMaterial({ color: "#d9b38c", roughness: 0.8 }),
    }),
    [paving, page],
  );
  useEffect(
    () => () =>
      Object.values(materials)
        .flat()
        .forEach((material) => material.dispose()),
    [materials],
  );
  const crowns = useRef<(Group | null)[]>([]);
  const leaf = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    crowns.current.forEach((crown, index) => {
      if (!crown) return;
      const { sway } = TREES[index];
      crown.rotation.z = Math.sin(t * 0.6 + sway) * 0.012;
      crown.rotation.x = Math.sin(t * 0.45 + 1 + sway) * 0.008;
    });
    // A page lifting in the evening breeze and settling back.
    if (leaf.current) leaf.current.rotation.z = 0.04 + 0.6 * Math.max(0, Math.sin(t * 0.7)) ** 3;
  });

  return (
    <group>
      <mesh material={materials.floor} rotation-x={-Math.PI / 2} position-y={0.001} renderOrder={-1}>
        <circleGeometry args={[GROUND_RADIUS, 64]} />
      </mesh>
      {/* Each crown sways about its tree's foot. */}
      {TREES.map((tree, index) => (
        <group
          key={index}
          ref={(node) => {
            crowns.current[index] = node;
          }}
          position={[tree.x, 0, tree.z]}
          rotation-y={tree.turn}
        >
          <mesh
            geometry={treeMesh.geometry}
            material={treeMesh.material}
            scale={tree.height / 2}
            position-y={tree.height / 2}
          />
        </group>
      ))}
      <FallingPetals crowns={CROWNS} intro={intro} snapSeconds={SNAP_SECONDS} />
      <SnapFires key={intro} snapSeconds={SNAP_SECONDS} />
      <Courtyard />
      <StoneLantern />
      {/* An open notebook, one page lifting. */}
      <group position={[0.44, 0, 0.3]} rotation-y={-0.5}>
        <mesh material={materials.covers[0]} position-y={0.004}>
          <boxGeometry args={[NOTEBOOK_SIZE[0] * 2 + 0.01, 0.008, NOTEBOOK_SIZE[1] + 0.01]} />
        </mesh>
        <mesh material={materials.page} position={[-NOTEBOOK_SIZE[0] / 2, 0.011, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
        <group ref={leaf} position-y={0.012}>
          <mesh material={materials.page} position-x={NOTEBOOK_SIZE[0] / 2} rotation-x={-Math.PI / 2}>
            <planeGeometry args={NOTEBOOK_SIZE} />
          </mesh>
        </group>
        <group position={[NOTEBOOK_SIZE[0] * 0.95, 0.012, NOTEBOOK_SIZE[1] / 2]}>
          <SmoulderingCorner width={0.06} seed={1.3} />
        </group>
        <group position={[0.02, 0.008, 0.13]} rotation={[0, 0.3, Math.PI / 2]}>
          <mesh material={materials.pencil}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
          </mesh>
          <mesh material={materials.lead} position-y={0.08}>
            <coneGeometry args={[0.006, 0.02, 6]} />
          </mesh>
        </group>
      </group>
      {/* Two closed notebooks in a pile, and a loose page. */}
      <group position={[-0.5, 0, 0.36]} rotation-y={0.7}>
        <Notebook cover={materials.covers[1]} paper={materials.paper} level={0} />
        <Notebook cover={materials.covers[2]} paper={materials.paper} level={1} />
      </group>
      <group position={[0.36, 0, -0.42]} rotation-y={2.6}>
        <mesh material={materials.page} position-y={0.004} rotation-x={-Math.PI / 2}>
          <planeGeometry args={NOTEBOOK_SIZE} />
        </mesh>
        <group position={[NOTEBOOK_SIZE[0] / 2, 0.004, -NOTEBOOK_SIZE[1] / 2]}>
          <SmoulderingCorner width={0.08} seed={5.7} />
        </group>
      </group>
    </group>
  );
}
