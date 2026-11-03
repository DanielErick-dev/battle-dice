"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  ShapeGeometry,
  Shape,
  type InstancedMesh,
} from "three";
import { useSoftDisc } from "../kit/matchAssets";
import { seededRandom } from "@/game/domain/core/random";

const PETALS = 140;

const PETAL_SIZE = 0.026;
/** A burning petal's glow, as many petal sizes across. */
const GLOW_SIZE = 4;
/** Seconds a petal takes to burn away once it catches, and the spread of when they catch after the snap. */
const BURN_SECONDS = 0.8;
const CATCH_SPREAD = 0.35;

/** A tree's crown petals fall from: its middle and how far round it they start. */
export interface Crown {
  x: number;
  y: number;
  z: number;
  radius: number;
}

/** The crimson of the trees they fall from. */
const BLOSSOM = new Color("#b5122b");
/** Above 1.0, so bloom picks the hottest petals up. */
const EMBER = new Color("#ff7a2a").multiplyScalar(2.2);
const ASH = new Color("#3a1408");
const FLARE = new Color("#ff6a1a");
const DARK = new Color(0, 0, 0);

/**
 * Crimson petals shaken off the trees' crowns, drifting down and fluttering, one instanced mesh. At the snap of
 * Akane's fingers (`snapSeconds` into each intro, a new `intro` key per replay) every petal in the air catches at
 * once, flares up from crimson to ember orange and burns away to nothing; fresh ones fall from the crowns after.
 */
export function FallingPetals({
  crowns,
  intro,
  snapSeconds,
}: {
  crowns: readonly Crown[];
  intro: string;
  snapSeconds: number;
}) {
  const geometry = useMemo(() => {
    // A petal with the notch at its tip that cherry petals have.
    const shape = new Shape();
    shape.moveTo(0, -0.5);
    shape.bezierCurveTo(0.45, -0.3, 0.45, 0.3, 0.14, 0.5);
    shape.lineTo(0, 0.36);
    shape.lineTo(-0.14, 0.5);
    shape.bezierCurveTo(-0.45, 0.3, -0.45, -0.3, 0, -0.5);
    return new ShapeGeometry(shape, 6);
  }, []);
  const material = useMemo(
    () =>
      // Unlit, so a burning petal glows by itself in the dusk.
      new MeshBasicMaterial({ side: DoubleSide, toneMapped: false }),
    [],
  );
  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );
  const petals = useMemo(() => {
    const random = seededRandom(43);
    return Array.from({ length: PETALS }, (_, index) => {
      const crown = crowns[index % crowns.length];
      const angle = random() * Math.PI * 2;
      const out = Math.sqrt(random()) * crown.radius;
      const top = crown.y + (random() - 0.3) * crown.radius * 0.6;
      return {
        x: crown.x + Math.cos(angle) * out,
        z: crown.z + Math.sin(angle) * out,
        top,
        // Where in its fall it starts, so they don't all leave the crown together.
        height: random() * top,
        // Drifting off the tree towards the middle of the stage as it falls.
        driftX: -crown.x * (0.25 + random() * 0.35),
        driftZ: 0.15 + random() * 0.3,
        speed: 0.12 + random() * 0.08,
        phase: random() * Math.PI * 2,
        spin: 1 + random() * 2,
        // Clock seconds it caught at (null while whole), and how much later than the snap it catches.
        caughtAt: null as number | null,
        lag: random() * CATCH_SPREAD,
      };
    });
  }, [crowns]);
  const disc = useSoftDisc();
  const glowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        map: disc,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
    [disc],
  );
  const glowGeometry = useMemo(() => new PlaneGeometry(1, 1), []);
  useEffect(
    () => () => {
      glowMaterial.dispose();
      glowGeometry.dispose();
    },
    [glowMaterial, glowGeometry],
  );
  const glows = useRef<InstancedMesh>(null);
  /** Clock seconds the current intro started, and whether its snap has set the petals alight yet. */
  const clockAt = useRef<{ intro: string; start: number | null; snapped: boolean }>({
    intro,
    start: null,
    snapped: false,
  });
  const mesh = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);

  // The colour buffer has to exist before the first draw, or the shader is built without it.
  useEffect(() => {
    for (let index = 0; index < PETALS; index++) {
      mesh.current?.setColorAt(index, BLOSSOM);
      glows.current?.setColorAt(index, DARK);
    }
  }, []);

  useFrame(({ clock, camera }, delta) => {
    if (!mesh.current || !glows.current) return;
    const t = clock.elapsedTime;
    const timing = clockAt.current;
    if (timing.intro !== intro) clockAt.current = { intro, start: null, snapped: false };
    clockAt.current.start ??= t;
    const snap = !clockAt.current.snapped && t - clockAt.current.start >= snapSeconds;
    if (snap) clockAt.current.snapped = true;
    petals.forEach((petal, index) => {
      petal.height -= petal.speed * delta;
      if (snap && petal.caughtAt === null) petal.caughtAt = t + petal.lag;
      // 0 while it falls whole, rising to 1 as it burns through.
      const burnt = petal.caughtAt === null ? 0 : Math.min(1, Math.max(0, (t - petal.caughtAt) / BURN_SECONDS));
      // Burnt away, or down on the ground: a fresh one leaves the crown.
      if (burnt >= 1 || petal.height < 0) {
        petal.height = petal.height < 0 ? petal.height + petal.top : petal.top;
        petal.caughtAt = null;
      }
      // 0 as it leaves the crown, 1 at the ground.
      const fallen = 1 - petal.height / petal.top;
      dummy.position.set(
        petal.x + petal.driftX * fallen + Math.sin(t * 0.7 + petal.phase) * 0.1,
        petal.height,
        petal.z + petal.driftZ * fallen + Math.cos(t * 0.5 + petal.phase) * 0.05,
      );
      dummy.rotation.set(t * petal.spin + petal.phase, petal.phase, Math.sin(t * 1.5 + petal.phase) * 0.8);
      // It flares up a little as it catches, then shrinks away.
      dummy.scale.setScalar(PETAL_SIZE * (1 + Math.sin(Math.min(1, burnt * 2) * Math.PI) * 0.5) * (1 - burnt ** 2));
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(index, dummy.matrix);
      // The glow round it, turned to the camera: bright as it catches, dying with it.
      const flare = burnt > 0 && burnt < 1 ? Math.sin(burnt * Math.PI) : 0;
      dummy.quaternion.copy(camera.quaternion);
      dummy.scale.setScalar(PETAL_SIZE * GLOW_SIZE * (0.4 + flare));
      dummy.updateMatrix();
      glows.current!.setMatrixAt(index, dummy.matrix);
      glows.current!.setColorAt(index, tint.copy(FLARE).multiplyScalar(flare * 0.9));
      // Pink, then flaring to ember, then dying to ash as it shrinks away.
      if (burnt < 0.6) tint.copy(BLOSSOM).lerp(EMBER, burnt / 0.6);
      else tint.copy(EMBER).lerp(ASH, (burnt - 0.6) / 0.4);
      tint.multiplyScalar(1 + Math.sin(t * 13 + petal.phase) * 0.15 * burnt);
      mesh.current!.setColorAt(index, tint);
    });
    for (const instanced of [mesh.current, glows.current]) {
      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      <instancedMesh ref={mesh} args={[geometry, material, PETALS]} frustumCulled={false} />
      <instancedMesh ref={glows} args={[glowGeometry, glowMaterial, PETALS]} frustumCulled={false} renderOrder={3} />
    </>
  );
}
