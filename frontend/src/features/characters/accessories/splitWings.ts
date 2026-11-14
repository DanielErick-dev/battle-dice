import { BufferGeometry, Float32BufferAttribute } from "three";

/** The pair as two geometries: the triangles left of the middle (x < 0), and those right of it. */
export function splitDownTheMiddle(geometry: BufferGeometry): { left: BufferGeometry; right: BufferGeometry } {
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const position = source.getAttribute("position");
  const onLeft = (first: number) => position.getX(first) + position.getX(first + 1) + position.getX(first + 2) < 0;
  const build = (left: boolean) => {
    const half = new BufferGeometry();
    for (const name of Object.keys(source.attributes)) {
      const attribute = source.getAttribute(name);
      const values: number[] = [];
      for (let first = 0; first < position.count; first += 3) {
        if (onLeft(first) !== left) continue;
        for (let vertex = first; vertex < first + 3; vertex++) {
          for (let component = 0; component < attribute.itemSize; component++) {
            values.push(attribute.getComponent(vertex, component));
          }
        }
      }
      half.setAttribute(name, new Float32BufferAttribute(values, attribute.itemSize));
    }
    return half;
  };
  const halves = { left: build(true), right: build(false) };
  if (source !== geometry) source.dispose();
  return halves;
}
