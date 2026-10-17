"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  DoubleSide,
  IcosahedronGeometry,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  Vector3,
  type Group,
  type InstancedMesh,
} from "three";
import { useFeatherTexture } from "@/features/match/scene/character/HeavenDescent";
import { seededRandom } from "@/game/domain/random";
import { useAge } from "@/features/match/scene/useAge";
import { GUSTS } from "./seraphEntrance";

/** How long what a downstroke shakes off its wing tips takes to fly off and fade. */
const GUST_SECONDS = 1.4;
/** Feathers and motes of light shaken off each wing tip per downstroke. */
const FEATHERS = 10;
const MOTES = 18;
/** How far they fly (stage units: he stands 1.7 tall), and how fast they sink. */
const FLIGHT = 0.9;
const SINK = 0.35;

/** Where the wing tips are, in world space, kept up to date by the wings (see Wings' `tips`). */
export interface WingTips {
  left: Vector3;
  right: Vector3;
}

/**
 * What Seraphiel's downstrokes shake off on his way down (see seraphEntrance): on each, feathers and
 * motes of golden light fly off both wing tips, out and down with the beat, tumbling and fading.
 * Mounted with his entrance (age from its start), anywhere: it's laid out from the tips in world space.
 */
export function WindGusts({ tips }: { tips: WingTips }) {
  const age = useAge();
  return (
    <>
      {GUSTS.map(({ at, strength }, index) => (
        <Gust key={index} at={at} strength={strength} seed={index + 1} tips={tips} age={age} />
      ))}
    </>
  );
}

interface Piece {
  side: 1 | -1;
  /** Its flight, as a direction away from the tip (out to its side, down, a little back or forth). */
  out: number;
  down: number;
  across: number;
  spin: number;
  size: number;
  delay: number;
}

function pieces(seed: number, count: number): Piece[] {
  const random = seededRandom(seed);
  return Array.from({ length: count * 2 }, (_, index) => ({
    side: index % 2 === 0 ? 1 : -1,
    out: 0.4 + random() * 0.8,
    down: 0.2 + random() * 0.7,
    across: (random() - 0.5) * 0.8,
    spin: 3 + random() * 7,
    size: 0.7 + random() * 0.6,
    delay: random() * 0.15,
  }));
}

function Gust({
  at,
  strength,
  seed,
  tips,
  age,
}: {
  at: number;
  /** 0 to 1: how far they fly and how many show. */
  strength: number;
  seed: number;
  tips: WingTips;
  age: (now: number) => number;
}) {
  const featherTexture = useFeatherTexture();
  const feathers = useMemo(() => pieces(seed * 13, FEATHERS), [seed]);
  const motes = useMemo(() => pieces(seed * 29, MOTES), [seed]);
  const geometries = useMemo(
    () => ({ feather: new PlaneGeometry(0.035, 0.09), mote: new IcosahedronGeometry(0.012, 0) }),
    [],
  );
  const materials = useMemo(
    () => ({
      feather: new MeshBasicMaterial({
        map: featherTexture,
        color: "#fffaf0",
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
      }),
      mote: new MeshBasicMaterial({
        color: "#ffe9a8",
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    }),
    [featherTexture],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
      Object.values(materials).forEach((material) => material.dispose());
    },
    [geometries, materials],
  );

  const root = useRef<Group>(null);
  const featherMesh = useRef<InstancedMesh>(null);
  const moteMesh = useRef<InstancedMesh>(null);
  /** Where the tips were as the downstroke came, in this group's frame: where everything flies from. */
  const origins = useRef<{ left: Vector3; right: Vector3 } | null>(null);
  const scratch = useMemo(() => ({ dummy: new Object3D(), point: new Vector3() }), []);

  useFrame(({ clock }) => {
    const group = root.current;
    if (!group) return;
    const life = (age(clock.elapsedTime) - at) / GUST_SECONDS;
    group.visible = life > 0 && life < 1;
    if (!group.visible) return;
    origins.current ??= {
      left: group.worldToLocal(tips.left.clone()),
      right: group.worldToLocal(tips.right.clone()),
    };
    const { left, right } = origins.current;
    const { dummy, point } = scratch;
    const fly = (list: Piece[], mesh: InstancedMesh | null, tumble: boolean) => {
      if (!mesh) return;
      list.forEach((piece, index) => {
        const u = Math.max(0, Math.min(1, (life * GUST_SECONDS - piece.delay) / GUST_SECONDS));
        const out = (1 - (1 - u) ** 2) * FLIGHT * (0.5 + 0.5 * strength);
        point
          .copy(piece.side === 1 ? right : left)
          .add(
            dummy.position.set(
              piece.side * piece.out * out,
              -piece.down * out * 0.6 - u * u * SINK,
              piece.across * out,
            ),
          );
        dummy.position.copy(point);
        dummy.rotation.set(tumble ? u * piece.spin : 0, u * piece.spin, tumble ? u * piece.spin * 0.6 : 0);
        dummy.scale.setScalar(u <= 0 ? 0 : piece.size * (1 - u ** 3));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    fly(feathers, featherMesh.current, true);
    fly(motes, moteMesh.current, false);
    materials.feather.setValues({ opacity: Math.min(1, (1 - life) * 2.5) });
    materials.mote.setValues({ opacity: (1 - life) ** 1.5 });
  });

  return (
    <group ref={root} visible={false}>
      <instancedMesh
        ref={featherMesh}
        args={[geometries.feather, materials.feather, feathers.length]}
        frustumCulled={false}
      />
      <instancedMesh ref={moteMesh} args={[geometries.mote, materials.mote, motes.length]} frustumCulled={false} />
    </group>
  );
}
