import { useEffect, useMemo } from "react";
import { CanvasTexture, CatmullRomCurve3, Plane, SRGBColorSpace, TubeGeometry, Vector3 } from "three";
import { seededRandom, type RandomSource } from "@/game/domain/random";
import { FLOOR_Y } from "../layout";

/** Paints a square canvas `size` pixels wide; module-level so a texture is drawn once. */
export type Painter = (context: CanvasRenderingContext2D, size: number, random: RandomSource) => void;

/**
 * A canvas texture painted by `paint`. With `fade`, it fades to transparent from that share of the radius out
 * to the rim, so a patch of ground doesn't end in a hard circle.
 */
export function usePaintedTexture(paint: Painter, seed: number, size = 512, fade?: number): CanvasTexture {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const context = canvas.getContext("2d")!;
    paint(context, size, seededRandom(seed));
    if (fade !== undefined) {
      const gradient = context.createRadialGradient(
        size / 2,
        size / 2,
        (size / 2) * fade,
        size / 2,
        size / 2,
        size / 2,
      );
      gradient.addColorStop(0, "rgba(0,0,0,1)");
      gradient.addColorStop(1, "rgba(0,0,0,0)");
      context.globalCompositeOperation = "destination-in";
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
    }
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [paint, seed, size, fade]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

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
