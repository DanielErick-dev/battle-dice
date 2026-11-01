"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type RefObject } from "react";
import { Vector3, type Group, type Mesh, type Object3D, type Sprite } from "three";
import type { IntroFrostBeats } from "../../../characters";
import { useAge } from "../../useAge";
import { useBone } from "../core/bones";
import { placeInWorld } from "../core/worldPlacement";
import { useDisposable } from "../shared/disposal";
import { approachLinear, clamp01, easeOutCubic, smoothstep } from "../shared/easing";
import { pointsGeometry } from "../shared/pointsGeometry";
import { ColdBreath } from "./ColdBreath";
import { arcHeight, chunkLayout, DUST, dustVelocities, spikeLayout } from "./frostSlamLayout";
import { useCameraJolt } from "./useCameraJolt";
import { useFrostSlamMaterials } from "./useFrostSlamMaterials";

/** Sizes as shares of his height: the frost spreading over the floor, and how far the shockwave runs. */
const FROST_RADIUS = 0.42;
const WAVE_RADIUS = 0.75;
/** Seconds for the frost to spread, the shockwave to run out and the flash to die. */
const SPREAD_SECONDS = 0.35;
const WAVE_SECONDS = 0.6;
const FLASH_SECONDS = 0.25;
/** Seconds each spike takes to burst out of the floor. */
const SPIKE_RISE_SECONDS = 0.14;
/** Shards of ice gathering round the raised fist before it comes down. */
const FIST_SHARDS = 6;
const FIST_ORBIT = 0.07;
/** The pull bringing the dust and the snow chunks back down (shares of his height per s²), and how long the dust hangs. */
const DUST_GRAVITY = 1.6;
const DUST_SECONDS = 1.3;
const CHUNK_GRAVITY = 2.6;
/** Per second: how fast it all melts away once the intro is over. */
const FADE_RATE = 0.8;

const scratch = { hand: new Vector3(), point: new Vector3() };

/**
 * Bjorn's intro: frost gathers round his raised fist, and as it slams the ground the floor
 * freezes over in a web of cracks, ice spikes burst out round the blow, a shockwave and a spray
 * of ice dust and chunks of snow fly out and the camera jolts. Once the intro is over (`active`
 * false) the spikes sink back and the frost melts away. His cold breath steams (see ColdBreath)
 * all the while he's on the stage, heavier after the blow. Mounted fresh with every intro.
 */
export function FrostSlam({
  figure,
  size,
  beats,
  active,
}: {
  figure: Object3D;
  size: number;
  beats: IntroFrostBeats;
  active: RefObject<boolean>;
}) {
  const root = useRef<Group>(null);
  const impact = useRef<Group>(null);
  const frost = useRef<Mesh>(null);
  const wave = useRef<Mesh>(null);
  const flash = useRef<Sprite>(null);
  const fistGlow = useRef<Sprite>(null);
  const shards = useRef<(Mesh | null)[]>([]);
  const spikes = useRef<(Mesh | null)[]>([]);
  const chunks = useRef<(Mesh | null)[]>([]);
  const hand = useBone(figure, "LeftHand");
  const jolt = useCameraJolt();
  const materials = useFrostSlamMaterials();
  /** Where the fist hit the floor, fixed at the blow. */
  const struck = useRef<Vector3 | null>(null);

  const spikePlan = useMemo(() => spikeLayout(), []);
  const dust = useMemo(() => ({ geometry: pointsGeometry(DUST), velocities: dustVelocities() }), []);
  useDisposable(dust.geometry);
  const chunkPlan = useMemo(() => chunkLayout(), []);

  const age = useAge();
  const presence = useRef(0);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group || !hand) return;
    const t = age(clock.elapsedTime);
    presence.current = approachLinear(presence.current, active.current ? 1 : 0, FADE_RATE, delta);
    const fade = presence.current;
    const since = t - beats.impactSeconds;
    const floorY = group.getWorldPosition(scratch.point).y;
    hand.getWorldPosition(scratch.hand);

    // Frost gathers round the fist as it's raised, swirling tighter until the blow.
    const charge =
      since < 0 ? smoothstep(clamp01((t - beats.raiseSeconds) / (beats.impactSeconds - beats.raiseSeconds))) : 0;
    if (fistGlow.current) {
      fistGlow.current.visible = charge > 0.01;
      placeInWorld(fistGlow.current, group, scratch.hand, size * (0.06 + 0.1 * charge));
      materials.glow.setValues({
        opacity: charge * (0.75 + 0.25 * Math.sin(t * 30)),
      });
    }
    shards.current.forEach((piece, index) => {
      if (!piece) return;
      piece.visible = charge > 0.01;
      const angle = (index / FIST_SHARDS) * Math.PI * 2 + t * (4 + charge * 8);
      const orbit = FIST_ORBIT * (1.6 - charge) * size;
      scratch.point.set(
        scratch.hand.x + Math.cos(angle) * orbit,
        scratch.hand.y + Math.sin(angle * 2 + index) * orbit * 0.4,
        scratch.hand.z + Math.sin(angle) * orbit,
      );
      placeInWorld(piece, group, scratch.point, size);
      piece.rotation.set(t * 5 + index, t * 3, 0);
    });

    // The blow: the floor under the fist, fixed from then on.
    if (since >= 0 && !struck.current) struck.current = new Vector3(scratch.hand.x, floorY, scratch.hand.z);
    if (impact.current) {
      impact.current.visible = struck.current !== null && fade > 0.01;
      if (struck.current) placeInWorld(impact.current, group, struck.current, size);
    }
    if (struck.current) {
      const spread = easeOutCubic(clamp01(since / SPREAD_SECONDS));
      frost.current?.scale.setScalar(FROST_RADIUS * (0.3 + 0.7 * spread));
      materials.frost.setValues({ opacity: Math.min(1, spread * 1.4) * fade });

      const run = clamp01(since / WAVE_SECONDS);
      wave.current?.scale.setScalar(0.05 + easeOutCubic(run) * WAVE_RADIUS);
      materials.wave.setValues({ opacity: 0.9 * (1 - run) });

      const burst = clamp01(since / FLASH_SECONDS);
      if (flash.current) flash.current.scale.setScalar(0.25 + 0.45 * burst);
      materials.flash.setValues({
        opacity: since < FLASH_SECONDS ? 1 - burst : 0,
      });

      spikes.current.forEach((piece, index) => {
        if (!piece) return;
        const { angle, ring, height, lean, delay } = spikePlan[index];
        const up = easeOutCubic(clamp01((since - delay) / SPIKE_RISE_SECONDS));
        // Out of the floor at once, and sinking back in as it melts.
        const shown = up * Math.min(1, fade * 1.3);
        piece.visible = shown > 0.01;
        piece.position.set(Math.cos(angle) * ring, 0, Math.sin(angle) * ring);
        piece.scale.set(1 + height * 2, height * shown, 1 + height * 2);
        piece.rotation.set(0, -angle, 0);
        piece.rotateZ(-lean);
      });
      materials.ice.setValues({ opacity: Math.min(1, fade * 1.5) });

      const dustAge = Math.min(since, DUST_SECONDS);
      const positions = dust.geometry.getAttribute("position");
      dust.velocities.forEach((velocity, index) => {
        positions.setXYZ(
          index,
          velocity.x * dustAge,
          arcHeight(velocity.y, dustAge, DUST_GRAVITY),
          velocity.z * dustAge,
        );
      });
      positions.needsUpdate = true;
      materials.dust.setValues({ opacity: 1 - clamp01(since / DUST_SECONDS) });

      // Snow chunks fly out in arcs, tumbling, and lie where they land until it all melts.
      chunks.current.forEach((piece, index) => {
        if (!piece) return;
        const { velocity, size: chunk, spin } = chunkPlan[index];
        const landsAt = (2 * velocity.y) / CHUNK_GRAVITY;
        const flight = Math.min(since, landsAt);
        piece.position.set(velocity.x * flight, arcHeight(velocity.y, flight, CHUNK_GRAVITY), velocity.z * flight);
        piece.rotation.set(spin.x * flight, spin.y * flight, spin.z * flight);
        piece.scale.setScalar(chunk);
        piece.visible = true;
      });
      materials.snow.setValues({ opacity: Math.min(1, fade * 1.5) });

      // A hard jolt with the blow, quickly settling.
      jolt(since);
    }
  });

  return (
    <group ref={root}>
      <sprite ref={fistGlow} material={materials.glow} visible={false} />
      {Array.from({ length: FIST_SHARDS }, (_, index) => (
        <mesh
          key={`shard${index}`}
          ref={(mesh) => {
            shards.current[index] = mesh;
          }}
          geometry={materials.shard}
          material={materials.ice}
          visible={false}
        />
      ))}
      <group ref={impact} visible={false}>
        <mesh ref={frost} material={materials.frost} rotation-x={-Math.PI / 2} position-y={0.002} renderOrder={1}>
          <planeGeometry args={[2, 2]} />
        </mesh>
        <mesh ref={wave} material={materials.wave} rotation-x={-Math.PI / 2} position-y={0.004} renderOrder={1}>
          <ringGeometry args={[0.92, 1, 64]} />
        </mesh>
        <sprite ref={flash} material={materials.flash} position-y={0.05} />
        {spikePlan.map((_, index) => (
          <mesh
            key={`spike${index}`}
            ref={(mesh) => {
              spikes.current[index] = mesh;
            }}
            geometry={materials.spike}
            material={materials.ice}
            visible={false}
          />
        ))}
        <points geometry={dust.geometry} material={materials.dust} />
        {chunkPlan.map((_, index) => (
          <mesh
            key={`chunk${index}`}
            ref={(mesh) => {
              chunks.current[index] = mesh;
            }}
            geometry={materials.chunk}
            material={materials.snow}
            visible={false}
          />
        ))}
      </group>
      <ColdBreath figure={figure} size={size} heavyAt={beats.impactSeconds} />
    </group>
  );
}
