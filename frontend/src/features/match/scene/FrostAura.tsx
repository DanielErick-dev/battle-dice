"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  ShaderMaterial,
  SpriteMaterial,
  type Mesh,
  type Sprite,
} from "three";
import { seededRandom } from "@/game/domain/random";
import { GLACIER, ICE, iceShard, useCrackTexture } from "./character/shared/ice";
import { useSoftDisc } from "./character/shared/softDisc";

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * A blizzard hugging him: cold mist rising slowly, cut by thin gusts of wind spiralling up round
 * him in fits. Nothing like the licking flames of the energy aura.
 */
const FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform float uGusts;
  uniform vec3 uDeep;
  uniform vec3 uPale;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // Noise wrapped round the cylinder with no seam: x runs 0..width as vUv.x runs 0..1.
  float wrapped(vec2 p, float width) {
    return mix(noise(p), noise(p - vec2(width, 0.0)), vUv.x);
  }

  void main() {
    float fade = smoothstep(0.0, 0.18, vUv.y) * pow(clamp(1.0 - vUv.y, 0.0, 1.0), 1.6);

    vec2 m = vec2(vUv.x * 6.0, vUv.y * 2.0 - uTime * 0.22);
    float mist = wrapped(m, 6.0) * 0.6 + wrapped(m * 2.0 + vec2(0.0, 3.1), 12.0) * 0.4;
    mist = smoothstep(0.4, 0.9, mist);

    // Five thin gusts winding up round him, each blowing in fits along its length.
    float s = vUv.x * 5.0 + vUv.y * 1.4 - uTime * 0.55;
    float band = 1.0 - abs(fract(s) * 2.0 - 1.0);
    float id = mod(floor(s), 5.0);
    float fits = smoothstep(0.35, 0.75, noise(vec2(id * 3.7, vUv.y * 2.5 - uTime * 0.9)));
    float gust = smoothstep(0.9, 1.0, band) * fits;

    // Kept under 1.0, so the bloom leaves it alone and the figure inside still reads.
    vec3 color = mix(uDeep, uPale, clamp(mist * 0.4 + gust, 0.0, 1.0));
    float alpha = (mist * 0.14 + gust * uGusts) * fade * uPower;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Height of the aura (effects units: a figure modelled 1.9 tall, see EFFECT_SCALE). */
const HEIGHT = 2.2;
/** Where the cast's blow lands on his chest: the crystals burst out from there. */
const CHEST = 1.25;
/** Per second: how fast the aura takes hold, and how slowly it melts away once it ends. */
const IGNITE_RATE = 4;
const MELT_RATE = 1.2;
/** Tiny ice crystals orbiting him in three tilted bands (heights), tumbling as they go. */
const CRYSTALS = 18;
const BANDS = [0.55, 1.05, 1.55];
const ORBIT = [0.55, 0.8];
const CRYSTAL_SIZE = [0.07, 0.13];
/** Seconds for a crystal to fly out of his chest to its orbit, and between one and the next. */
const BURST_SECONDS = 0.6;
const BURST_STAGGER = 0.02;
/** Snow swirling up round him. */
const FLAKES = 70;
const FLAKE_RISE_SECONDS = 4;
/** Frost under his feet, and the cold wave that runs out as the aura takes hold. */
const FROST_RADIUS = 1.1;
const WAVE_RADIUS = 3;
const WAVE_SECONDS = 0.7;
const FLASH_SECONDS = 0.3;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOut = (x: number) => 1 - (1 - x) ** 3;

/**
 * The Berserker's Untamed, while it lasts: a blizzard hugging him (see FRAGMENT), tiny ice
 * crystals orbiting him and glinting now and then, snow swirling up and a little frost under his
 * feet. It takes hold `delay` seconds after `active` comes on (as the cast clip's blow on his chest
 * lands): the crystals burst out of his chest to their orbits, with a flash and a cold wave over the
 * ground. When it ends, it melts away and the crystals drop. In the token's effects frame (see
 * EFFECT_SCALE), like EnergyAura.
 */
export function FrostAura({ active, delay }: { active: boolean; delay: number }) {
  const cracks = useCrackTexture();
  const disc = useSoftDisc();
  const star = useStarTexture();
  const crystals = useMemo(() => {
    const random = seededRandom(61);
    return Array.from({ length: CRYSTALS }, (_, index) => {
      const geometry = iceShard(random, 0.28, false);
      // Spun about its middle, not its foot.
      geometry.translate(0, -0.45, 0);
      const band = index % BANDS.length;
      return {
        geometry,
        height: BANDS[band] + (random() - 0.5) * 0.15,
        tilt: (random() - 0.5) * 0.5,
        angle: (index / CRYSTALS) * Math.PI * 2 + (random() - 0.5) * 0.5,
        radius: ORBIT[0] + random() * (ORBIT[1] - ORBIT[0]),
        // Neighbouring bands orbit opposite ways.
        speed: (band % 2 ? -1 : 1) * (0.3 + random() * 0.3),
        size: CRYSTAL_SIZE[0] + random() * (CRYSTAL_SIZE[1] - CRYSTAL_SIZE[0]),
        tumble: [random() * 2 - 1, random() * 2 - 1, random() * 2 - 1].map((x) => x * 1.6),
        bob: random() * Math.PI * 2,
        glint: 0.6 + random() * 0.8,
      };
    });
  }, []);
  const flakes = useMemo(() => {
    const random = seededRandom(67);
    const swirl = Array.from({ length: FLAKES }, () => ({
      angle: random() * Math.PI * 2,
      radius: 0.35 + random() * 0.6,
      phase: random(),
      spin: 0.5 + random() * 0.7,
    }));
    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(FLAKES * 3), 3));
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(FLAKES * 3), 3));
    return { swirl, geometry };
  }, []);
  const materials = useMemo(() => {
    const shell = (deep: string, pale: string, gusts: number, time: number) =>
      new ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: {
          uTime: { value: time },
          uPower: { value: 0 },
          uGusts: { value: gusts },
          uDeep: { value: new Color(deep) },
          uPale: { value: new Color(pale) },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });
    return {
      mist: shell("#1e3a8a", "#bfe3ff", 0.12, 0),
      gale: shell("#1d4ed8", "#e6f6ff", 0.4, 4.1),
      crystal: new MeshStandardMaterial({
        color: "#e8f6ff",
        emissive: "#3b82c4",
        emissiveIntensity: 0.35,
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
      }),
      snow: new PointsMaterial({
        map: disc,
        size: 0.07,
        vertexColors: true,
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
      frost: new MeshBasicMaterial({
        map: cracks,
        color: ICE,
        transparent: true,
        blending: AdditiveBlending,
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
      flash: new SpriteMaterial({
        map: disc,
        color: GLACIER.clone().lerp(ICE, 0.5),
        transparent: true,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    };
  }, [cracks, disc]);
  // Each crystal glints on its own, so each glint gets its own material.
  const glintMaterials = useMemo(
    () =>
      crystals.map(
        () =>
          new SpriteMaterial({
            map: star,
            color: new Color("#e6f6ff"),
            transparent: true,
            blending: AdditiveBlending,
            depthWrite: false,
            toneMapped: false,
          }),
      ),
    [crystals, star],
  );
  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      glintMaterials.forEach((material) => material.dispose());
      crystals.forEach(({ geometry }) => geometry.dispose());
      flakes.geometry.dispose();
    },
    [materials, glintMaterials, crystals, flakes],
  );

  const crystalMeshes = useRef<(Mesh | null)[]>([]);
  const glintSprites = useRef<(Sprite | null)[]>([]);
  const frost = useRef<Mesh>(null);
  const wave = useRef<Mesh>(null);
  const flash = useRef<Sprite>(null);
  /** When it took hold (clock seconds); how strong it is (0 to 1), rising as it takes hold and falling as it melts. */
  const heldSince = useRef<number | null>(null);
  const wasActive = useRef(false);
  const power = useRef(0);

  useFrame(({ clock }, delta) => {
    const now = clock.elapsedTime;
    // Taking hold from nothing; back on before it has melted (the cast handing over to the
    // ability itself), it simply carries on.
    if (active && !wasActive.current && power.current <= 0.01) heldSince.current = now + delay;
    wasActive.current = active;
    const since = heldSince.current === null ? -1 : now - heldSince.current;
    const holding = active && since >= 0;
    power.current = holding
      ? Math.min(1, power.current + delta * IGNITE_RATE)
      : Math.max(0, power.current - delta * MELT_RATE);
    const strength = power.current;

    for (const [material, speed] of [
      [materials.mist, 1],
      [materials.gale, 1.4],
    ] as const) {
      material.uniforms.uTime.value += delta * speed;
      material.uniforms.uPower.value = strength;
    }

    // The crystals burst out of his chest to their orbits, circle him tumbling and bobbing, and drop
    // and shrink away as it melts.
    crystals.forEach((crystal, index) => {
      const mesh = crystalMeshes.current[index];
      const sprite = glintSprites.current[index];
      if (!mesh || !sprite) return;
      const out = holding ? easeOut(clamp01((since - index * BURST_STAGGER) / BURST_SECONDS)) : 1;
      const angle = crystal.angle + now * crystal.speed;
      const radius = crystal.radius * out;
      const orbitY = crystal.height + Math.sin(angle) * crystal.radius * crystal.tilt;
      const y = CHEST + (orbitY - CHEST) * out + Math.sin(now * 1.3 + crystal.bob) * 0.04 - (1 - strength) * 0.4;
      const size = crystal.size * Math.min(1, out * 1.5) * (0.4 + 0.6 * strength);
      // Never drawn at (near) zero scale: its normal matrix would turn to NaN and the bloom would
      // smear that over the whole screen, blacking it out.
      const visible = strength > 0.01 && size > 0.005;
      mesh.visible = visible;
      mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      mesh.rotation.set(now * crystal.tumble[0], now * crystal.tumble[1], now * crystal.tumble[2]);
      mesh.scale.setScalar(Math.max(size, 0.005));

      // Now and then one catches the light.
      const twinkle = Math.max(0, Math.sin(now * crystal.glint + index * 2.3)) ** 24;
      sprite.visible = visible && twinkle > 0.02;
      sprite.position.copy(mesh.position);
      sprite.scale.setScalar(0.08 + twinkle * 0.22);
      glintMaterials[index].setValues({ opacity: strength * twinkle * 0.8 });
    });
    materials.crystal.setValues({ opacity: Math.min(1, strength * 1.4) });

    // Snow swirling up round him, fading in at his feet and out above his head.
    const positions = flakes.geometry.getAttribute("position") as BufferAttribute;
    const colors = flakes.geometry.getAttribute("color") as BufferAttribute;
    flakes.swirl.forEach((flake, index) => {
      const rise = (now / FLAKE_RISE_SECONDS + flake.phase) % 1;
      const angle = flake.angle + now * flake.spin;
      const radius = flake.radius * (1 - rise * 0.35);
      positions.setXYZ(index, Math.cos(angle) * radius, rise * HEIGHT, Math.sin(angle) * radius);
      const glow = Math.sin(rise * Math.PI) * strength * 0.7;
      colors.setXYZ(index, glow * 0.85, glow * 0.95, glow);
    });
    positions.needsUpdate = true;
    colors.needsUpdate = true;

    if (frost.current) {
      frost.current.visible = strength > 0.01;
      const spread = holding ? easeOut(clamp01(since / 0.4)) : 1;
      frost.current.scale.setScalar(FROST_RADIUS * (0.3 + 0.7 * spread));
    }
    materials.frost.setValues({
      opacity: 0.22 * strength * (0.85 + 0.15 * Math.sin(now * 1.7)),
    });

    const run = holding ? clamp01(since / WAVE_SECONDS) : 1;
    if (wave.current) {
      wave.current.visible = run < 1;
      wave.current.scale.setScalar(0.3 + easeOut(run) * WAVE_RADIUS);
    }
    materials.wave.setValues({ opacity: 0.5 * (1 - run) });
    const burst = holding ? clamp01(since / FLASH_SECONDS) : 1;
    if (flash.current) {
      flash.current.visible = burst < 1;
      flash.current.scale.setScalar(0.8 + burst * 1.6);
    }
    materials.flash.setValues({ opacity: 0.5 * (1 - burst) });
  });

  return (
    <group>
      <mesh position-y={HEIGHT / 2} material={materials.mist} renderOrder={2}>
        <cylinderGeometry args={[0.45, 0.6, HEIGHT, 48, 1, true]} />
      </mesh>
      <mesh position-y={HEIGHT * 0.45} material={materials.gale} renderOrder={2}>
        <cylinderGeometry args={[0.6, 0.8, HEIGHT * 0.9, 48, 1, true]} />
      </mesh>
      <points geometry={flakes.geometry} material={materials.snow} frustumCulled={false} renderOrder={2} />
      <mesh ref={frost} material={materials.frost} rotation-x={-Math.PI / 2} position-y={0.03} renderOrder={1}>
        <planeGeometry args={[2, 2]} />
      </mesh>
      <mesh ref={wave} material={materials.wave} rotation-x={-Math.PI / 2} position-y={0.04} renderOrder={1}>
        <ringGeometry args={[0.9, 1, 64]} />
      </mesh>
      <sprite ref={flash} material={materials.flash} position-y={CHEST} visible={false} />
      {crystals.map(({ geometry }, index) => (
        <mesh
          key={index}
          ref={(mesh) => {
            crystalMeshes.current[index] = mesh;
          }}
          geometry={geometry}
          material={materials.crystal}
          visible={false}
        />
      ))}
      {glintMaterials.map((material, index) => (
        <sprite
          key={index}
          ref={(sprite) => {
            glintSprites.current[index] = sprite;
          }}
          material={material}
          visible={false}
        />
      ))}
    </group>
  );
}

/** A four-pointed glint of light: two thin crossed rays over a soft core, white on transparent. */
function useStarTexture(): CanvasTexture {
  const texture = useMemo(() => {
    const size = 64;
    const centre = size / 2;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    const core = context.createRadialGradient(centre, centre, 0, centre, centre, size * 0.22);
    core.addColorStop(0, "rgba(255,255,255,1)");
    core.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = core;
    context.fillRect(0, 0, size, size);
    for (const [width, height] of [
      [size, 3],
      [3, size],
    ]) {
      const ray = context.createRadialGradient(centre, centre, 0, centre, centre, size / 2);
      ray.addColorStop(0, "rgba(255,255,255,0.95)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = ray;
      context.fillRect(centre - width / 2, centre - height / 2, width, height);
    }
    return new CanvasTexture(canvas);
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
