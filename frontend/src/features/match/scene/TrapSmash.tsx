"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AdditiveBlending, CanvasTexture, Color, type Group, type Mesh, type MeshBasicMaterial } from "three";
import { TILE_HEIGHT, TILE_SIZE, type Vec3 } from "./boardLayout";
import { useAge } from "./useAge";

const IMPACT_SECONDS = 1.2;
const SHARD_COUNT = 14;
const GRAVITY = 9;

/** Mounts its children `seconds` after it mounts itself, to line effects up with a clip's beat. */
export function Delayed({ seconds, children }: { seconds: number; children: ReactNode }) {
  const [shown, setShown] = useState(seconds <= 0);
  const age = useAge();
  useFrame(({ clock }) => {
    if (!shown && age(clock.elapsedTime) >= seconds) setShown(true);
  });
  return shown ? children : null;
}

/**
 * Blades driven into the ground: the stone cracks open in a flash of the character's colour and
 * dark shards fly out. Mounted with a fresh key per use, inside the token's effect scale.
 */
export function SwordImpact({ color }: { color: string }) {
  const root = useRef<Group>(null);
  const shardRefs = useRef<(Mesh | null)[]>([]);
  const crack = useRef<MeshBasicMaterial>(null);
  const wave = useRef<Mesh>(null);
  const waveMaterial = useRef<MeshBasicMaterial>(null);
  const shards = useMemo(() => launchShards(), []);
  const cracks = useCrackTexture();
  const glow = useMemo(() => new Color(color).multiplyScalar(2.4), [color]);
  const age = useAge();

  useFrame(({ clock }) => {
    const seconds = age(clock.elapsedTime);
    const t = seconds / IMPACT_SECONDS;
    if (root.current) root.current.visible = t < 1;
    if (t >= 1) return;

    shards.forEach((shard, index) => {
      const mesh = shardRefs.current[index];
      if (!mesh) return;
      const height = shard.velocity[1] * seconds - (GRAVITY * seconds * seconds) / 2;
      mesh.position.set(shard.velocity[0] * seconds, Math.max(0.05, 0.1 + height), shard.velocity[2] * seconds);
      mesh.rotation.set(shard.spin[0] * seconds, shard.spin[1] * seconds, shard.spin[2] * seconds);
      mesh.scale.setScalar(shard.size * (1 - t * t));
    });

    if (crack.current) crack.current.opacity = Math.min(1, t * 12) * (1 - t) ** 0.7;
    wave.current?.scale.setScalar(0.4 + (1 - (1 - t) ** 3) * 2.6);
    if (waveMaterial.current) waveMaterial.current.opacity = 0.8 * (1 - t);
  });

  return (
    <group ref={root}>
      <mesh rotation-x={-Math.PI / 2} position-y={0.06}>
        <planeGeometry args={[2.4, 2.4]} />
        <meshBasicMaterial
          ref={crack}
          map={cracks}
          color={glow}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={wave} rotation-x={-Math.PI / 2} position-y={0.07}>
        <ringGeometry args={[0.5, 0.62, 48]} />
        <meshBasicMaterial
          ref={waveMaterial}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {shards.map((shard, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            shardRefs.current[index] = mesh;
          }}
        >
          <tetrahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#21152e" emissive={color} emissiveIntensity={0.35} roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

/** Stone shards thrown up and out in every direction, each tumbling its own way. */
function launchShards() {
  return Array.from({ length: SHARD_COUNT }, (_, index) => {
    const angle = (index / SHARD_COUNT) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 1.4 + Math.random() * 1.6;
    return {
      velocity: [Math.cos(angle) * speed, 2.5 + Math.random() * 2.5, Math.sin(angle) * speed] as Vec3,
      spin: [Math.random() * 12 - 6, Math.random() * 12 - 6, Math.random() * 12 - 6] as Vec3,
      size: 0.06 + Math.random() * 0.08,
    };
  });
}

/**
 * What a smashed trap leaves on its tile for the rest of the game: loose chunks of dark stone
 * and cracks with the character's colour breathing in them (the face itself shows the wreck).
 */
export function SmashedTrapMark({ tile, position, color }: { tile: number; position: Vec3; color: string }) {
  const cracks = useCrackTexture();
  const glowMaterial = useRef<MeshBasicMaterial>(null);
  const glow = useMemo(() => new Color(color).multiplyScalar(2.2), [color]);
  const rubble = useMemo(() => scatterRubble(tile), [tile]);
  useFrame(({ clock }) => {
    if (glowMaterial.current) glowMaterial.current.opacity = 0.6 + Math.sin(clock.elapsedTime * 2.2) * 0.25;
  });

  const top = position[1] + TILE_HEIGHT / 2;
  return (
    <group position={[position[0], top, position[2]]}>
      <mesh position-y={0.014} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[TILE_SIZE * 0.9, TILE_SIZE * 0.9]} />
        <meshBasicMaterial
          ref={glowMaterial}
          map={cracks}
          color={glow}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
      {rubble.map((rock, index) => (
        <mesh key={index} position={rock.position} rotation={rock.rotation} scale={rock.size}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color="#1d1726" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** Chunks of broken stone lying on the tile, laid out the same way every time for that tile. */
function scatterRubble(tile: number) {
  let seed = tile * 7919 + 1;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 7 }, () => {
    const angle = random() * Math.PI * 2;
    const reach = 0.25 + random() * 0.5;
    const size = 0.06 + random() * 0.08;
    return {
      position: [Math.cos(angle) * reach, size * 0.6, Math.sin(angle) * reach] as Vec3,
      rotation: [random() * Math.PI, random() * Math.PI, random() * Math.PI] as Vec3,
      size,
    };
  });
}

/** White cracks (tinted by the material) running out from the middle, as a texture. */
function useCrackTexture() {
  const texture = useMemo(() => new CanvasTexture(drawCracks()), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Jagged cracks branching out from a shattered centre, from a fixed seed. */
function drawCracks(): HTMLCanvasElement {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  context.translate(size / 2, size / 2);
  context.strokeStyle = "white";
  context.lineCap = "round";
  context.lineJoin = "round";

  let seed = 11;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  const crack = (x: number, y: number, angle: number, length: number, width: number) => {
    context.lineWidth = width;
    context.beginPath();
    context.moveTo(x, y);
    let travelled = 0;
    while (travelled < length) {
      const step = 8 + random() * 10;
      angle += (random() - 0.5) * 0.9;
      x += Math.cos(angle) * step;
      y += Math.sin(angle) * step;
      travelled += step;
      context.lineTo(x, y);
      if (width > 1.5 && random() < 0.18) {
        context.stroke();
        crack(x, y, angle + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6), length * 0.4, width * 0.55);
        context.lineWidth = width;
        context.beginPath();
        context.moveTo(x, y);
      }
    }
    context.stroke();
  };

  const arms = 9;
  for (let index = 0; index < arms; index += 1) {
    crack(0, 0, (index / arms) * Math.PI * 2 + random() * 0.5, 70 + random() * 45, 4);
  }
  // The shattered middle.
  context.fillStyle = "white";
  context.beginPath();
  context.arc(0, 0, 9, 0, Math.PI * 2);
  context.fill();
  return canvas;
}
