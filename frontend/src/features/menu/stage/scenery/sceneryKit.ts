import { BufferGeometry, CatmullRomCurve3, Color, Float32BufferAttribute, Plane, TubeGeometry, Vector3 } from "three";
import type { RandomSource } from "@/game/domain/random";
import { FLOOR_Y } from "../layout";

/** A tube along `points` that thins towards its last point (roots, trunks, branches). */
export function taperedTube(points: [number, number, number][], radius: number, taper = 0.8, tubular = 24) {
  const radial = 7;
  const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
  const geometry = new TubeGeometry(curve, tubular, radius, radial, false);
  const position = geometry.getAttribute("position");
  const centre = new Vector3();
  const vertex = new Vector3();
  // TubeGeometry lays its rings out at getPointAt(i / tubular), radial + 1 vertices each.
  for (let ring = 0; ring <= tubular; ring++) {
    curve.getPointAt(ring / tubular, centre);
    const scale = 1 - taper * (ring / tubular);
    for (let side = 0; side <= radial; side++) {
      const index = ring * (radial + 1) + side;
      vertex.fromBufferAttribute(position, index).sub(centre).multiplyScalar(scale).add(centre);
      position.setXYZ(index, vertex.x, vertex.y, vertex.z);
    }
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Cuts what dips under the stage floor: the floor doesn't write depth, so buried parts would show through it. */
export const ABOVE_FLOOR = [new Plane(new Vector3(0, 1, 0), -FLOOR_Y)];

/** Moves each corner by a random amount, the same for every face sharing it, so a rock stays closed. */
export function roughen<T extends BufferGeometry>(geometry: T, random: RandomSource, amount: number): T {
  const position = geometry.getAttribute("position");
  const offsets = new Map<string, number[]>();
  for (let index = 0; index < position.count; index++) {
    const [x, y, z] = [position.getX(index), position.getY(index), position.getZ(index)];
    const key = `${x.toFixed(3)},${y.toFixed(3)},${z.toFixed(3)}`;
    let offset = offsets.get(key);
    if (!offset) {
      offset = [0, 0, 0].map(() => (random() - 0.5) * amount);
      offsets.set(key, offset);
    }
    position.setXYZ(index, x + offset[0], y + offset[1], z + offset[2]);
  }
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A tuft of `blades` grass blades about `height` tall rising from its origin, each a bent strip tapering to a point,
 * shaded from `root` to `tip` (vertex colours). Sway it by rotating the mesh about its base.
 */
export function grassTuft(
  random: RandomSource,
  blades: number,
  height: number,
  root: Color,
  tip: Color,
): BufferGeometry {
  const levels = 4;
  const positions: number[] = [];
  const colors: number[] = [];
  const shade = new Color();
  for (let blade = 0; blade < blades; blade++) {
    const angle = random() * Math.PI * 2;
    const foot = random() * height * 0.12;
    const tall = height * (0.55 + random() * 0.45);
    const reach = tall * (0.15 + random() * 0.45);
    const width = height * (0.035 + random() * 0.025);
    const brightness = 0.8 + random() * 0.35;
    // The blade's flat side faces across its lean, so it bends like a strap.
    const side = [-Math.sin(angle), Math.cos(angle)];
    const ring = Array.from({ length: levels + 1 }, (_, level) => {
      const t = level / levels;
      const out = foot + reach * t * t;
      const x = Math.cos(angle) * out;
      const z = Math.sin(angle) * out;
      const y = tall * t * (1 - 0.25 * t * t);
      const w = width * (1 - t);
      shade.copy(root).lerp(tip, t).multiplyScalar(brightness);
      return {
        left: [x - side[0] * w, y, z - side[1] * w],
        right: [x + side[0] * w, y, z + side[1] * w],
        colour: shade.toArray(),
      };
    });
    for (let level = 0; level < levels; level++) {
      const a = ring[level];
      const b = ring[level + 1];
      positions.push(...a.left, ...a.right, ...b.left, ...a.right, ...b.right, ...b.left);
      colors.push(...a.colour, ...a.colour, ...b.colour, ...a.colour, ...b.colour, ...b.colour);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** Places on the ring between `inner` and `outer` (radius), clear of the patch in front of the figure. */
export function scatterAround(random: RandomSource, count: number, inner: number, outer: number): [number, number][] {
  const spots: [number, number][] = [];
  while (spots.length < count) {
    const angle = random() * Math.PI * 2;
    const radius = inner + Math.sqrt(random()) * (outer - inner);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    // The camera looks in from +Z: keep its line to the feet open, and the sides within the stage.
    if ((z > 0 && Math.abs(x) < 0.32) || Math.abs(x) > 0.85) continue;
    spots.push([x, z]);
  }
  return spots;
}
