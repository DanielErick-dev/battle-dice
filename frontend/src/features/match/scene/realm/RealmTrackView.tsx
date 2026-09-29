"use client";

import { Billboard, QuadraticBezierLine, Sparkles } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  TubeGeometry,
  Vector3,
  type Group,
  type Mesh,
  type ShaderMaterial,
} from "three";
import { getTile } from "@/game/domain/board";
import type { Board, RealmTrack } from "@/game/domain/types";
import { TILE_HEIGHT, TILE_SIZE, type BoardLayout, type Vec3 } from "../boardLayout";
import { TileMesh } from "../TileMesh";
import { REALM_PALETTES } from "../tileTheme";
import { NOISE_GLSL } from "./noise";

/** How fast the track rises into view and sinks away (presence per second). */
const APPEAR_RATE = 0.8;
const VANISH_RATE = 0.7;
/** Where tiles come from: up out of the lava below, or down from the sky. */
const ARRIVAL_OFFSET = { infernal: -5, celestial: 7 } as const;

const RIBBON_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** Energy streaming along the ribbon from the portal towards the exit. */
const RIBBON_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  uniform float uReveal;
  uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uReveal) discard;
    float pulses = smoothstep(0.55, 1.0, sin(vUv.x * 90.0 - uTime * 7.0));
    float core = 0.55 + 0.45 * sin(vUv.y * 6.2832 * 2.0);
    vec3 color = uColor * (1.2 + pulses * 2.2) * core;
    gl_FragColor = vec4(color, (0.45 + pulses * 0.55) * uOpacity);
  }
`;

interface RealmTrackViewProps {
  track: RealmTrack;
  board: Board;
  layout: BoardLayout;
  /** Someone is on the track (or its gate is opening): it shows; otherwise it sinks away. */
  open: boolean;
  highlighted: ReadonlySet<number>;
  reachable: ReadonlySet<number>;
  textureSize: number;
}

/**
 * A realm track: a bridge of tiles over the board whose tiles rise up from below (infernal)
 * or float down from the sky (celestial) one after another from the portal, joined by a
 * ribbon of flowing energy, and sink away again once nobody is on it.
 */
export function RealmTrackView({ track, board, layout, open, highlighted, reachable, textureSize }: RealmTrackViewProps) {
  const palette = REALM_PALETTES[track.realm];
  const presence = useRef(0);
  const [flames] = useState(() => new Set<ShaderMaterial>());
  const root = useRef<Group>(null);
  const tiles = useRef<(Group | null)[]>([]);
  const ribbon = useRef<ShaderMaterial>(null);
  const positions = useMemo(() => track.tiles.map((id) => layout.position(id)), [track, layout]);

  const ribbonGeometry = useMemo(() => {
    const lift = (position: Vec3) => new Vector3(position[0], position[1] + TILE_HEIGHT / 2 + 0.05, position[2]);
    return new TubeGeometry(new CatmullRomCurve3(positions.map(lift), false, "centripetal"), 120, 0.08, 8, false);
  }, [positions]);
  const links = useMemo(() => {
    const lift = ([x, y, z]: Vec3): Vec3 => [x, y + TILE_HEIGHT / 2 + 0.1, z];
    const arc = (from: Vec3, to: Vec3) => {
      const [a, b] = [lift(from), lift(to)];
      const length = Math.hypot(b[0] - a[0], b[2] - a[2]);
      return { start: a, end: b, mid: [(a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 1.5 + length * 0.25, (a[2] + b[2]) / 2] as Vec3 };
    };
    return [arc(layout.position(track.portal), positions[0]), arc(positions.at(-1)!, layout.position(track.exit))];
  }, [track, layout, positions]);
  const linkLines = useRef<({ material: { opacity: number } } | null)[]>([]);
  const ribbonUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new Color(palette.glow) },
    }),
    [palette.glow],
  );

  useFrame(({ clock }, delta) => {
    const rate = open ? APPEAR_RATE : VANISH_RATE;
    presence.current += ((open ? 1 : 0) - presence.current) * Math.min(1, delta * rate * 3);
    const amount = presence.current;
    if (root.current) root.current.visible = amount > 0.005;
    if (amount <= 0.005) return;

    const count = positions.length;
    tiles.current.forEach((tile, i) => {
      if (!tile) return;
      // Tiles arrive in order from the portal; each eases in over its own slice of the reveal.
      const local = Math.min(1, Math.max(0, amount * (count + 1.5) - i));
      const eased = 1 - (1 - local) ** 3;
      const bob = Math.sin(clock.elapsedTime * 1.3 + i * 0.9) * (track.realm === "celestial" ? 0.12 : 0.05);
      tile.position.set(positions[i][0], positions[i][1] + (1 - eased) * ARRIVAL_OFFSET[track.realm] + bob * eased, positions[i][2]);
      tile.scale.setScalar(0.25 + 0.75 * eased);
      tile.visible = local > 0.01;
    });

    linkLines.current.forEach((line) => {
      if (line) line.material.opacity = amount * 0.6;
    });
    flames.forEach((material) => {
      material.uniforms.uTime.value = clock.elapsedTime;
      material.uniforms.uOpacity.value = amount;
    });
    if (ribbon.current) {
      ribbon.current.uniforms.uTime.value = clock.elapsedTime;
      ribbon.current.uniforms.uOpacity.value = amount;
      ribbon.current.uniforms.uReveal.value = Math.min(1, amount * 1.15);
    }
  });

  return (
    <group ref={root} visible={false}>
      <mesh geometry={ribbonGeometry}>
        <shaderMaterial
          ref={ribbon}
          vertexShader={RIBBON_VERTEX}
          fragmentShader={RIBBON_FRAGMENT}
          uniforms={ribbonUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {links.map((link, i) => (
        <QuadraticBezierLine
          key={i}
          ref={(line) => {
            linkLines.current[i] = line as unknown as { material: { opacity: number } } | null;
          }}
          {...link}
          color={palette.glow}
          lineWidth={2.5}
          dashed
          dashScale={5}
          transparent
          opacity={0}
        />
      ))}

      {track.tiles.map((id, i) => {
        const tile = getTile(board, id);
        const next = tile.next ? layout.position(tile.next) : null;
        const arrowAngle = next ? Math.atan2(next[2] - positions[i][2], next[0] - positions[i][0]) : null;
        return (
          <group
            key={id}
            ref={(group) => {
              tiles.current[i] = group;
            }}
            position={positions[i]}
          >
            <TileMesh
              tile={tile}
              position={[0, 0, 0]}
              accent={palette.glow}
              arrowAngle={arrowAngle}
              highlighted={highlighted.has(id)}
              reachable={reachable.has(id)}
              textureSize={textureSize}
            />
            {track.realm === "infernal" ? (
              <>
                <MoltenUnderside color={palette.glow} />
                <FlameWall flames={flames} />
              </>
            ) : (
              <>
                <HaloUnderside color={palette.glow} phase={i} />
                <LightPosts color={palette.glow} />
              </>
            )}
          </group>
        );
      })}

      <TrackSparkles positions={positions} color={track.realm === "infernal" ? "#ff7a2a" : "#fff1b8"} />
    </group>
  );
}

/** Obsidian stalactites dripping lava-light under an infernal tile. */
function MoltenUnderside({ color }: { color: string }) {
  return (
    <group position-y={-TILE_HEIGHT / 2}>
      {[
        [0, 0, 0.9],
        [-0.45, 0.3, 0.6],
        [0.4, -0.35, 0.55],
      ].map(([x, z, length]) => (
        <mesh key={`${x}:${z}`} position={[x, -length / 2, z]} rotation-x={Math.PI}>
          <coneGeometry args={[0.28, length, 6]} />
          <meshStandardMaterial color="#120404" emissive={color} emissiveIntensity={0.9} roughness={0.35} metalness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/** A slowly turning golden halo floating under a celestial tile. */
function HaloUnderside({ color, phase }: { color: string; phase: number }) {
  const halo = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (halo.current) halo.current.rotation.z = clock.elapsedTime * 0.5 + phase;
  });
  return (
    <mesh ref={halo} position-y={-TILE_HEIGHT / 2 - 0.35} rotation-x={-Math.PI / 2}>
      <torusGeometry args={[TILE_SIZE * 0.42, 0.05, 8, 48]} />
      <meshBasicMaterial color={new Color(color).multiplyScalar(2.2)} toneMapped={false} transparent opacity={0.9} blending={AdditiveBlending} />
    </mesh>
  );
}

/** Embers or motes drifting along the whole track. */
function TrackSparkles({ positions, color }: { positions: readonly Vec3[]; color: string }) {
  const { center, size } = useMemo(() => {
    const xs = positions.map(([x]) => x);
    const ys = positions.map(([, y]) => y);
    const zs = positions.map(([, , z]) => z);
    const span = (values: number[]) => Math.max(...values) - Math.min(...values);
    const middle = (values: number[]) => (Math.max(...values) + Math.min(...values)) / 2;
    return {
      center: [middle(xs), middle(ys) + 1, middle(zs)] as Vec3,
      size: [span(xs) + 3, span(ys) + 3, span(zs) + 3] as Vec3,
    };
  }, [positions]);
  return <Sparkles count={80} scale={size} position={center} size={4} speed={1} color={color} />;
}

const FLAME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vSeed;
  void main() {
    vUv = uv;
    vec4 origin = modelMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    vSeed = origin.x * 1.7 + origin.z * 2.3;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/** A licking flame: a noisy teardrop, white-hot at the root, fading to red at the tips. */
const FLAME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying float vSeed;
  ${NOISE_GLSL}
  void main() {
    float y = vUv.y;
    float n = fbm(vec2(vUv.x * 3.5 + vSeed, y * 2.8 - uTime * 3.2 + vSeed));
    // Distance from the flame's wavering centre line (0) to the plane's edge (1).
    float x = abs((vUv.x - 0.5) * 2.0 + (n - 0.5) * 0.7 * y);
    float edge = (1.0 - y) * 0.85 + 0.05;
    float body = 1.0 - smoothstep(edge * 0.3, edge, x);
    body *= 1.0 - smoothstep(0.3, 1.0, y + (n - 0.5) * 0.45);
    float heat = body * (1.0 - y);
    vec3 color = mix(vec3(2.2, 0.3, 0.02), vec3(2.6, 1.25, 0.25), smoothstep(0.25, 0.8, heat));
    float alpha = body * uOpacity;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Flames licking up on both sides of an infernal tile, always facing the camera. */
/** `flames` collects each flame's material so the track can animate and fade them all. */
function FlameWall({ flames }: { flames: Set<ShaderMaterial> }) {
  return (
    <>
      {[
        [-1.3, 0.3, 1.9],
        [1.3, -0.35, 1.5],
        [-1.15, -0.75, 1.2],
        [1.2, 0.7, 1.7],
      ].map(([x, z, height]) => (
        <Billboard key={`${x}:${z}`} position={[x, height / 2 - 0.2, z]} lockX lockZ>
          <mesh>
            <planeGeometry args={[1.1, height]} />
            <shaderMaterial
              ref={(material) => {
                if (!material) return;
                flames.add(material);
                return () => flames.delete(material);
              }}
              vertexShader={FLAME_VERTEX}
              fragmentShader={FLAME_FRAGMENT}
              uniforms={{ uTime: { value: 0 }, uOpacity: { value: 0 } }}
              transparent
              depthWrite={false}
            />
          </mesh>
        </Billboard>
      ))}
    </>
  );
}

/** Slender golden posts topped with light on both sides of a celestial tile. */
function LightPosts({ color }: { color: string }) {
  const glow = useMemo(() => new Color(color).multiplyScalar(3), [color]);
  return (
    <>
      {[-1.2, 1.2].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position-y={0.45}>
            <cylinderGeometry args={[0.04, 0.06, 0.9, 8]} />
            <meshStandardMaterial color="#e8d8a8" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position-y={0.98}>
            <octahedronGeometry args={[0.12]} />
            <meshBasicMaterial color={glow} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </>
  );
}
