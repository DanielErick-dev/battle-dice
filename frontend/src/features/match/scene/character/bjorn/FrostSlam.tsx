"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  DodecahedronGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  SpriteMaterial,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
  type Sprite,
} from "three";
import { seededRandom } from "@/game/domain/random";
import type { IntroFrostBeats } from "../../../characters";
import { useAge } from "../../useAge";
import { ColdBreath } from "./ColdBreath";
import { GLACIER, ICE, useCrackTexture } from "../shared/ice";
import { useSoftDisc } from "../shared/softDisc";
import { findBone, placeInWorld } from "../core/worldPlacement";

/** Sizes as shares of his height: the frost spreading over the floor, and how far the shockwave runs. */
const FROST_RADIUS = 0.42;
const WAVE_RADIUS = 0.75;
/** Seconds for the frost to spread, the shockwave to run out and the flash to die. */
const SPREAD_SECONDS = 0.35;
const WAVE_SECONDS = 0.6;
const FLASH_SECONDS = 0.25;
/** Ice spikes bursting out of the floor round the fist: how many, how far out, how tall. */
const SPIKES = 9;
const SPIKE_RING = [0.12, 0.34];
const SPIKE_HEIGHT = [0.1, 0.24];
const SPIKE_RISE_SECONDS = 0.14;
/** Shards of ice gathering round the raised fist before it comes down. */
const FIST_SHARDS = 6;
const FIST_ORBIT = 0.07;
/** Ice dust thrown up by the blow, and the pull bringing it back down (shares of his height per s²). */
const DUST = 70;
const DUST_GRAVITY = 1.6;
const DUST_SECONDS = 1.3;
/** Chunks of packed snow knocked flying by the blow: how many, how big, and the pull bringing them down. */
const CHUNKS = 16;
const CHUNK_SIZE = [0.018, 0.04];
const CHUNK_GRAVITY = 2.6;
/** How hard and how briefly the camera jolts with the blow. */
const JOLT = 0.06;
const JOLT_DECAY = 9;
/** Per second: how fast it all melts away once the intro is over. */
const FADE_RATE = 0.8;

const scratch = { hand: new Vector3(), point: new Vector3() };

const smooth = (x: number) => x * x * (3 - 2 * x);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

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
  const hand = useMemo(() => findBone(figure, "LeftHand"), [figure]);
  const camera = useThree((state) => state.camera);
  const glow = useSoftDisc();
  const cracks = useCrackTexture();
  /** Where the fist hit the floor, fixed at the blow. */
  const struck = useRef<Vector3 | null>(null);

  const spikeLayout = useMemo(() => {
    const random = seededRandom(17);
    return Array.from({ length: SPIKES }, (_, index) => {
      const angle = (index / SPIKES) * Math.PI * 2 + random() * 0.5;
      const ring = SPIKE_RING[0] + random() * (SPIKE_RING[1] - SPIKE_RING[0]);
      return {
        angle,
        ring,
        height: SPIKE_HEIGHT[0] + random() * (SPIKE_HEIGHT[1] - SPIKE_HEIGHT[0]),
        // Leaning out, away from the blow; the ones nearest it come up first.
        lean: 0.35 + random() * 0.35,
        delay: ((ring - SPIKE_RING[0]) / (SPIKE_RING[1] - SPIKE_RING[0])) * 0.12,
      };
    });
  }, []);
  const dust = useMemo(() => {
    const random = seededRandom(29);
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(DUST * 3), 3));
    const velocities = Array.from({ length: DUST }, () => {
      const angle = random() * Math.PI * 2;
      const out = 0.25 + random() * 0.55;
      return new Vector3(Math.cos(angle) * out, 0.5 + random() * 0.9, Math.sin(angle) * out);
    });
    return { geometry, velocities };
  }, []);
  const chunkLayout = useMemo(() => {
    const random = seededRandom(41);
    return Array.from({ length: CHUNKS }, () => {
      const angle = random() * Math.PI * 2;
      const out = 0.35 + random() * 0.6;
      return {
        velocity: new Vector3(Math.cos(angle) * out, 0.9 + random() * 0.8, Math.sin(angle) * out),
        size: CHUNK_SIZE[0] + random() * (CHUNK_SIZE[1] - CHUNK_SIZE[0]),
        spin: new Vector3(random() - 0.5, random() - 0.5, random() - 0.5).multiplyScalar(18),
      };
    });
  }, []);

  const materials = useMemo(
    () => ({
      // Base at the origin, so the spike grows up out of the floor as it scales.
      spike: new ConeGeometry(0.035, 1, 5).translate(0, 0.5, 0),
      shard: new ConeGeometry(0.012, 0.045, 4),
      chunk: new DodecahedronGeometry(1, 0),
      snow: new MeshStandardMaterial({
        color: "#f2f8ff",
        roughness: 0.9,
        flatShading: true,
        transparent: true,
      }),
      ice: new MeshStandardMaterial({
        color: ICE,
        emissive: GLACIER,
        emissiveIntensity: 0.6,
        metalness: 0.1,
        roughness: 0.15,
        flatShading: true,
        transparent: true,
      }),
      // Glacier blue rather than a glow, so the cracks still read on snow.
      frost: new MeshBasicMaterial({
        map: cracks,
        color: GLACIER,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
      wave: new MeshBasicMaterial({
        color: ICE,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      glow: new SpriteMaterial({
        map: glow,
        color: GLACIER.clone().lerp(ICE, 0.5),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      dust: new PointsMaterial({
        map: glow,
        color: ICE,
        size: 0.045,
        transparent: true,
        depthWrite: false,
      }),
    }),
    [cracks, glow],
  );
  // Each sprite fades on its own, so each gets its own copy of the material.
  const flashMaterial = useMemo(() => materials.glow.clone(), [materials]);
  useEffect(
    () => () => {
      for (const resource of [...Object.values(materials), flashMaterial, dust.geometry]) {
        resource.dispose();
      }
    },
    [materials, flashMaterial, dust.geometry],
  );
  // The camera jolts round where it stands, and is put back as the intro goes. Where it stands is
  // kept on the camera, so an intro played again mid-jolt doesn't take the jolted spot for it.
  const cameraHome = useMemo(() => (camera.userData.home ??= camera.position.clone()) as Vector3, [camera]);
  useEffect(() => () => void camera.position.copy(cameraHome), [camera, cameraHome]);

  const age = useAge();
  const presence = useRef(0);

  useFrame(({ clock }, delta) => {
    const group = root.current;
    if (!group || !hand) return;
    const t = age(clock.elapsedTime);
    presence.current += ((active.current ? 1 : 0) - presence.current) * Math.min(1, delta * FADE_RATE);
    const fade = presence.current;
    const since = t - beats.impactSeconds;
    const floorY = group.getWorldPosition(scratch.point).y;
    hand.getWorldPosition(scratch.hand);

    // Frost gathers round the fist as it's raised, swirling tighter until the blow.
    const charge =
      since < 0 ? smooth(clamp01((t - beats.raiseSeconds) / (beats.impactSeconds - beats.raiseSeconds))) : 0;
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
      const spread = 1 - (1 - clamp01(since / SPREAD_SECONDS)) ** 3;
      frost.current?.scale.setScalar(FROST_RADIUS * (0.3 + 0.7 * spread));
      materials.frost.setValues({ opacity: Math.min(1, spread * 1.4) * fade });

      const run = clamp01(since / WAVE_SECONDS);
      wave.current?.scale.setScalar(0.05 + (1 - (1 - run) ** 3) * WAVE_RADIUS);
      materials.wave.setValues({ opacity: 0.9 * (1 - run) });

      const burst = clamp01(since / FLASH_SECONDS);
      if (flash.current) flash.current.scale.setScalar(0.25 + 0.45 * burst);
      flashMaterial.setValues({
        opacity: since < FLASH_SECONDS ? 1 - burst : 0,
      });

      spikes.current.forEach((piece, index) => {
        if (!piece) return;
        const { angle, ring, height, lean, delay } = spikeLayout[index];
        const up = 1 - (1 - clamp01((since - delay) / SPIKE_RISE_SECONDS)) ** 3;
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
      const positions = dust.geometry.getAttribute("position") as BufferAttribute;
      dust.velocities.forEach((velocity, index) => {
        positions.setXYZ(
          index,
          velocity.x * dustAge,
          Math.max(0, velocity.y * dustAge - (DUST_GRAVITY / 2) * dustAge * dustAge),
          velocity.z * dustAge,
        );
      });
      positions.needsUpdate = true;
      materials.dust.setValues({ opacity: 1 - clamp01(since / DUST_SECONDS) });

      // Snow chunks fly out in arcs, tumbling, and lie where they land until it all melts.
      chunks.current.forEach((piece, index) => {
        if (!piece) return;
        const { velocity, size: chunk, spin } = chunkLayout[index];
        const landsAt = (2 * velocity.y) / CHUNK_GRAVITY;
        const flight = Math.min(since, landsAt);
        piece.position.set(
          velocity.x * flight,
          Math.max(0, velocity.y * flight - (CHUNK_GRAVITY / 2) * flight * flight),
          velocity.z * flight,
        );
        piece.rotation.set(spin.x * flight, spin.y * flight, spin.z * flight);
        piece.scale.setScalar(chunk);
        piece.visible = true;
      });
      materials.snow.setValues({ opacity: Math.min(1, fade * 1.5) });

      // A hard jolt with the blow, quickly settling.
      const jolt = since < 0.6 ? JOLT * Math.exp(-since * JOLT_DECAY) : 0;
      camera.position.set(
        cameraHome.x + Math.sin(since * 70) * jolt,
        cameraHome.y + Math.sin(since * 53 + 1) * jolt,
        cameraHome.z,
      );
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
        <sprite ref={flash} material={flashMaterial} position-y={0.05} />
        {spikeLayout.map((_, index) => (
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
        {chunkLayout.map((_, index) => (
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
