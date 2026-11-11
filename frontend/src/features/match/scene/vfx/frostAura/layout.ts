import { BufferAttribute, BufferGeometry } from "three";
import { seededRandom } from "@/game/domain/core/random";
import { iceShard } from "@/features/characters/shared/ice";
import { cycle } from "@/features/shared/collections/items";

/** Height of the aura (effects units: a figure modelled 1.9 tall, see EFFECT_SCALE). */
export const HEIGHT = 2.2;
/** Where the cast's blow lands on his chest: the crystals burst out from there. */
export const CHEST = 1.25;
/** Per second: how fast the aura takes hold, and how slowly it melts away once it ends. */
export const IGNITE_RATE = 4;
export const MELT_RATE = 1.2;
/** Tiny ice crystals orbiting him in three tilted bands (heights), tumbling as they go. */
const CRYSTALS = 18;
const BANDS = [0.55, 1.05, 1.55] as const;
const ORBIT = [0.55, 0.8] as const;
const CRYSTAL_SIZE = [0.07, 0.13] as const;
/** Seconds for a crystal to fly out of his chest to its orbit, and between one and the next. */
export const BURST_SECONDS = 0.6;
export const BURST_STAGGER = 0.02;
/** Snow swirling up round him. */
const FLAKES = 70;
export const FLAKE_RISE_SECONDS = 4;
/** Frost under his feet, and the cold wave that runs out as the aura takes hold. */
export const FROST_RADIUS = 1.1;
export const WAVE_RADIUS = 3;
export const WAVE_SECONDS = 0.7;
export const FLASH_SECONDS = 0.3;

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
export const easeOut = (x: number) => 1 - (1 - x) ** 3;

/** Each crystal's orbit, size and tumble, from a fixed seed so every aura looks the same. */
export function makeCrystals() {
  const random = seededRandom(61);
  return Array.from({ length: CRYSTALS }, (_, index) => {
    const geometry = iceShard(random, 0.28, false);
    // Spun about its middle, not its foot.
    geometry.translate(0, -0.45, 0);
    const band = index % BANDS.length;
    return {
      geometry,
      height: cycle(BANDS, index) + (random() - 0.5) * 0.15,
      tilt: (random() - 0.5) * 0.5,
      angle: (index / CRYSTALS) * Math.PI * 2 + (random() - 0.5) * 0.5,
      radius: ORBIT[0] + random() * (ORBIT[1] - ORBIT[0]),
      // Neighbouring bands orbit opposite ways.
      speed: (band % 2 ? -1 : 1) * (0.3 + random() * 0.3),
      size: CRYSTAL_SIZE[0] + random() * (CRYSTAL_SIZE[1] - CRYSTAL_SIZE[0]),
      tumble: [(random() * 2 - 1) * 1.6, (random() * 2 - 1) * 1.6, (random() * 2 - 1) * 1.6] as const,
      bob: random() * Math.PI * 2,
      glint: 0.6 + random() * 0.8,
    };
  });
}

/** Each snowflake's swirl, and the points geometry the frame loop writes them into. */
export function makeFlakes() {
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
}
