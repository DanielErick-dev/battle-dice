"use client";

import { createPortal, useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  Quaternion,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type Object3D,
  type Points,
  type PointsMaterial,
  type Sprite,
  type SpriteMaterial,
} from "three";

/**
 * Where the vial sits from the wrist, in the hand bone's own frame (Mixamo: +y runs along the
 * fingers), in model units: in the middle of the hand, whichever way the arm points.
 */
const HOLD_OFFSET = new Vector3(0, 0.07, 0.015);
/** How quickly the vial appears in the hand, and fades once let go. */
const GROW_RATE = 8;
const FADE_RATE = 5;
const GLASS = "#c7f9e5";
const CORK = "#6b4a2f";

/** Radians the vial turns forward when fully tipped to pour. */
const POUR_ANGLE = 2.1;
const X_AXIS = new Vector3(1, 0, 0);

interface HeldVialProps {
  figure: Object3D;
  color: string;
  active: RefObject<boolean>;
  /** How far the vial is tipped forward to pour, 0 (upright) to 1; uncorked once tipping. */
  tilt?: RefObject<number>;
  /** Filled every frame with where the vial's mouth is, in world space (for a PourStream). */
  mouth?: RefObject<Vector3>;
}

/**
 * A small alchemist's vial, glowing liquid inside, held in the figure's right hand while
 * `active` is on. Bound to the hand bone (Mixamo rig) and kept upright in the figure's own
 * frame, like the witch's staff, unless tipped forward to pour. Meshy figures can't hold props,
 * so it's made in code.
 */
export function HeldVial(props: HeldVialProps) {
  const hand = useMemo(() => findBone(props.figure, "RightHand"), [props.figure]);
  return hand ? createPortal(<Held {...props} hand={hand} />, hand) : null;
}

function Held({ figure, hand, color, active, tilt, mouth }: HeldVialProps & { hand: Object3D }) {
  const uncorked = useRef(false);
  const group = useRef<Group>(null);
  const strength = useRef(0);
  const scratch = useMemo(
    () => ({
      hand: new Quaternion(),
      figure: new Quaternion(),
      handScale: new Vector3(),
      figureScale: new Vector3(),
      tip: new Quaternion(),
    }),
    [],
  );

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const target = active.current ? 1 : 0;
    const rate = target > strength.current ? GROW_RATE : FADE_RATE;
    strength.current += (target - strength.current) * (1 - Math.exp(-rate * delta));
    node.visible = strength.current > 0.01;
    if (!node.visible) return;

    hand.getWorldQuaternion(scratch.hand);
    figure.getWorldQuaternion(scratch.figure);
    hand.getWorldScale(scratch.handScale);
    figure.getWorldScale(scratch.figureScale);
    // In the hand's frame: model units, undoing any scale the bone itself carries.
    node.position.copy(HOLD_OFFSET).multiplyScalar(scratch.figureScale.x / scratch.handScale.x);
    const tipped = tilt?.current ?? 0;
    uncorked.current = tipped > 0.05;
    scratch.tip.setFromAxisAngle(X_AXIS, tipped * POUR_ANGLE);
    node.quaternion.copy(scratch.hand.invert()).multiply(scratch.figure).multiply(scratch.tip);
    node.scale.setScalar((strength.current * scratch.figureScale.x) / scratch.handScale.x);
    if (mouth?.current) {
      node.updateWorldMatrix(true, false);
      node.localToWorld(mouth.current.set(0, HELD_SIZE * 1.9, 0));
    }
  });

  return (
    <group ref={group} visible={false}>
      <Vial color={color} size={HELD_SIZE} uncorked={uncorked} />
    </group>
  );
}

/** Bulb radius of the held vial, in model units. */
const HELD_SIZE = 0.05;

/**
 * The vial itself, `size` being its bulb's radius: a round glass bulb of glowing liquid, a neck
 * and a cork (popped while `uncorked`).
 */
function Vial({ color, size, uncorked }: { color: string; size: number; uncorked?: RefObject<boolean> }) {
  const glow = useMemo(() => new Color(color).multiplyScalar(1.8), [color]);
  const liquid = useRef<Mesh>(null);
  const cork = useRef<Mesh>(null);
  useFrame((state) => {
    if (liquid.current) liquid.current.scale.setScalar(0.82 + Math.sin(state.clock.elapsedTime * 6) * 0.03);
    if (cork.current) cork.current.visible = !uncorked?.current;
  });
  return (
    <group>
      <mesh ref={liquid}>
        <sphereGeometry args={[size, 16, 12]} />
        <meshBasicMaterial color={glow} toneMapped={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[size * 1.12, 20, 14]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.3} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh position-y={size * 1.45}>
        <cylinderGeometry args={[size * 0.32, size * 0.4, size * 0.9, 12]} />
        <meshStandardMaterial color={GLASS} transparent opacity={0.35} roughness={0.05} depthWrite={false} />
      </mesh>
      <mesh ref={cork} position-y={size * 2.05}>
        <cylinderGeometry args={[size * 0.36, size * 0.3, size * 0.4, 10]} />
        <meshStandardMaterial color={CORK} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Seconds the thrown vial flies, and how long its burst lasts after shattering. */
const FLIGHT_SECONDS = 0.45;
const BURST_SECONDS = 1.6;
const SPARKS = 48;
const PUFFS = 7;

/**
 * The alchemist's ability: a vial flung from her hand arcs down in front of her and shatters
 * with golden sparks, and a cloud of emerald smoke bursts up around her. In the figure's frame (it faces +z), sized
 * by `size` (the figure's height). Plays once; remount (new `key`) to play it again. Additive
 * glow only, no lights (they'd recompile the scene).
 */
export function VialShatter({ size, color }: { size: number; color: string }) {
  const glow = useMemo(() => new Color(color).multiplyScalar(1.6), [color]);
  const gold = useMemo(() => new Color("#fcd34d").multiplyScalar(2), []);
  const spark = useSparkTexture();
  const root = useRef<Group>(null);
  const vial = useRef<Group>(null);
  const splash = useRef<Mesh>(null);
  const puffs = useRef<(Mesh | null)[]>([]);
  const sparksMaterial = useRef<PointsMaterial>(null);
  const started = useRef<number | null>(null);
  // Where the thrown vial leaves her hand: raised at head height, a little in front and to her right.
  const from = useMemo(() => new Vector3(-size * 0.12, size * 0.9, size * 0.2), [size]);
  const to = useMemo(() => new Vector3(0, 0.05, size * 0.45), [size]);
  const { geometry, sparks } = useMemo(() => {
    const sparks = Array.from({ length: SPARKS }, (_, index) => ({
      angle: jitter(index, 1) * Math.PI * 2,
      out: 0.2 + jitter(index, 2) * 0.5,
      up: 0.3 + jitter(index, 3) * 0.7,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(SPARKS * 3), 3));
    return { geometry, sparks };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const elapsed = state.clock.elapsedTime - started.current;
    node.visible = elapsed < FLIGHT_SECONDS + BURST_SECONDS;
    if (!node.visible) return;

    // The flight: an arc from the hand down to the ground ahead, tumbling.
    const flight = Math.min(1, elapsed / FLIGHT_SECONDS);
    if (vial.current) {
      vial.current.visible = flight < 1;
      vial.current.position.lerpVectors(from, to, flight);
      vial.current.position.y += Math.sin(Math.PI * flight) * size * 0.18;
      vial.current.rotation.set(flight * 9, 0, flight * 4);
    }

    // The burst, once it hits the ground.
    const burst = (elapsed - FLIGHT_SECONDS) / BURST_SECONDS;
    const live = burst >= 0 && burst < 1;
    if (splash.current) {
      splash.current.visible = live;
      splash.current.scale.setScalar(0.1 + (1 - (1 - Math.max(0, burst)) ** 3) * size * 0.5);
      (splash.current.material as MeshBasicMaterial).opacity = (1 - burst) * 0.9;
    }
    puffs.current.forEach((puff, index) => {
      if (!puff) return;
      const local = Math.min(1, Math.max(0, (burst - index * 0.03) * 1.1));
      puff.visible = live && local > 0;
      const angle = (index / PUFFS) * Math.PI * 2;
      const spread = size * 0.12 * local;
      puff.position.set(
        to.x + Math.cos(angle) * spread,
        to.y + size * (0.05 + local * 0.25) * (0.6 + jitter(index, 4) * 0.8),
        to.z + Math.sin(angle) * spread,
      );
      puff.scale.setScalar(size * (0.06 + local * 0.16));
      (puff.material as MeshBasicMaterial).opacity = (1 - local) * 0.45;
    });

    const positions = geometry.getAttribute("position") as BufferAttribute;
    const fly = 1 - (1 - Math.max(0, burst)) ** 2;
    sparks.forEach((particle, index) => {
      const radius = size * particle.out * fly;
      positions.setXYZ(
        index,
        to.x + Math.cos(particle.angle) * radius,
        to.y + size * particle.up * (fly - fly * fly * 0.6),
        to.z + Math.sin(particle.angle) * radius,
      );
    });
    positions.needsUpdate = true;
    if (sparksMaterial.current) sparksMaterial.current.opacity = live ? 1 - burst : 0;
  });

  return (
    <>
      <SmokeCloud size={size} color={color} delay={FLIGHT_SECONDS} />
      <group ref={root}>
        <group ref={vial}>
          <Vial color={color} size={size * 0.03} />
        </group>
        <mesh ref={splash} position={to} rotation-x={-Math.PI / 2} visible={false}>
          <ringGeometry args={[0.7, 1, 48]} />
          <meshBasicMaterial
            color={glow}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {Array.from({ length: PUFFS }, (_, index) => (
          <mesh
            key={index}
            ref={(mesh) => {
              puffs.current[index] = mesh;
            }}
            visible={false}
          >
            <sphereGeometry args={[1, 16, 12]} />
            <meshBasicMaterial
              color={glow}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
        <points geometry={geometry}>
          <pointsMaterial
            ref={sparksMaterial}
            map={spark}
            color={gold}
            size={size * 0.03}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </points>
      </group>
    </>
  );
}

/** Drops in flight at once in a pour, and how fast they fall (world units/s², scaled by the figure). */
const POUR_DROPS = 40;
const POUR_GRAVITY = 5.5;

/**
 * Glowing liquid pouring from a vial down to the floor (local y = 0 of wherever it's placed):
 * drops leave `mouth` (world space) while `pouring` is on and fall under gravity. `size` is
 * the figure's height.
 */
export function PourStream({
  size,
  color,
  mouth,
  pouring,
}: {
  size: number;
  color: string;
  mouth: RefObject<Vector3>;
  pouring: RefObject<boolean>;
}) {
  const glow = useMemo(() => new Color(color).multiplyScalar(2), [color]);
  const spark = useSparkTexture();
  const points = useRef<Points>(null);
  const spawn = useRef(0);
  const { geometry, drops } = useMemo(() => {
    const drops = Array.from({ length: POUR_DROPS }, () => ({ live: false, x: 0, y: 0, z: 0, fall: 0 }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(POUR_DROPS * 3), 3));
    return { geometry, drops };
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const local = useMemo(() => new Vector3(), []);

  useFrame((_, delta) => {
    const node = points.current;
    if (!node?.parent || !mouth.current) return;
    if (pouring.current) spawn.current += delta * 60;
    const gravity = POUR_GRAVITY * (size / 1.7);
    drops.forEach((drop, index) => {
      if (!drop.live && spawn.current >= 1) {
        spawn.current -= 1;
        node.parent!.worldToLocal(local.copy(mouth.current!));
        Object.assign(drop, { live: true, x: local.x, y: local.y, z: local.z, fall: 0 });
      }
      if (drop.live) {
        drop.fall += gravity * delta;
        drop.y -= drop.fall * delta;
        if (drop.y <= 0) drop.live = false;
      }
      geometry.getAttribute("position").setXYZ(index, drop.x, drop.live ? drop.y : -100, drop.z);
    });
    spawn.current = Math.min(spawn.current, 1);
    geometry.getAttribute("position").needsUpdate = true;
  });

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        map={spark}
        color={glow}
        size={size * 0.022}
        transparent
        blending={AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/** Seconds an alchemical cloud takes to billow out and fade away. */
const CLOUD_SECONDS = 5.2;
const CLOUD_PUFFS = 32;

/**
 * A cloud of emerald smoke bursting up around a whole figure, from its feet to over its head,
 * billowing out and fading slowly. Sprites of soft smoke (always facing the camera) with a few
 * glowing ones inside. `size` is the figure's height; it bursts `delay` seconds after mounting.
 * Plays once; remount (new `key`) to replay.
 */
export function SmokeCloud({ size, color, delay = 0 }: { size: number; color: string; delay?: number }) {
  const smoke = useSmokeTexture();
  const tint = useMemo(() => new Color(color), [color]);
  const glow = useMemo(() => new Color(color).multiplyScalar(1.5), [color]);
  const root = useRef<Group>(null);
  const sprites = useRef<(Sprite | null)[]>([]);
  const started = useRef<number | null>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: CLOUD_PUFFS }, (_, index) => ({
        angle: jitter(index, 6) * Math.PI * 2,
        radius: 0.08 + jitter(index, 7) * 0.22,
        height: 0.05 + jitter(index, 8) * 1.05,
        grow: 0.6 + jitter(index, 9) * 0.5,
        spin: (jitter(index, 10) - 0.5) * 1.5,
        glows: index % 4 === 0,
      })),
    [],
  );

  useFrame((state) => {
    const node = root.current;
    if (!node) return;
    started.current ??= state.clock.elapsedTime;
    const t = (state.clock.elapsedTime - started.current - delay) / CLOUD_SECONDS;
    node.visible = t >= 0 && t < 1;
    if (!node.visible) return;
    // Bursts out fast, then lingers, drifting up and thinning out slowly.
    const burst = 1 - (1 - Math.min(1, t * 5)) ** 3;
    puffs.forEach((puff, index) => {
      const sprite = sprites.current[index];
      if (!sprite) return;
      const spread = size * puff.radius * (0.4 + burst * 0.8 + t * 0.5);
      sprite.position.set(
        Math.cos(puff.angle + t * 0.6) * spread,
        size * (puff.height + t * 0.15),
        Math.sin(puff.angle + t * 0.6) * spread,
      );
      sprite.scale.setScalar(size * puff.grow * (0.3 + burst * 0.7 + t * 0.4));
      const material = sprite.material as SpriteMaterial;
      material.rotation = puff.spin * t * 3;
      material.opacity = (puff.glows ? 0.55 : 0.9) * burst * (1 - t) ** 1.2;
    });
  });

  return (
    <group ref={root}>
      {puffs.map((puff, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            sprites.current[index] = sprite;
          }}
        >
          <spriteMaterial
            map={smoke}
            color={puff.glows ? glow : tint}
            transparent
            opacity={0}
            depthWrite={false}
            blending={puff.glows ? AdditiveBlending : undefined}
            toneMapped={!puff.glows}
          />
        </sprite>
      ))}
    </group>
  );
}

/** A soft, uneven blot of smoke: a few overlapping radial gradients. */
function useSmokeTexture() {
  const texture = useMemo(() => {
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    for (let blob = 0; blob < 6; blob += 1) {
      const x = size / 2 + (jitter(blob, 11) - 0.5) * size * 0.35;
      const y = size / 2 + (jitter(blob, 12) - 0.5) * size * 0.35;
      const radius = size * (0.25 + jitter(blob, 13) * 0.2);
      const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, "rgba(255,255,255,0.45)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** A stable pseudo-random number in [0, 1) for particle `index` and trait `salt`. */
function jitter(index: number, salt: number): number {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
}

/** A soft round dot, so points read as sparks rather than squares. */
function useSparkTexture() {
  const texture = useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,255,255,0.55)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** The rig's bone ending in `name` (the loader drops the "mixamorig:" colon). */
function findBone(figure: Object3D, name: string): Object3D | null {
  let bone: Object3D | null = null;
  figure.traverse((node) => {
    if (!bone && "isBone" in node && node.name.endsWith(name)) bone = node;
  });
  return bone;
}
