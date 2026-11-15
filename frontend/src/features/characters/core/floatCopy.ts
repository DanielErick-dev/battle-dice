import { BufferAttribute, type BufferGeometry } from "three";

/**
 * A copy of `geometry` whose attributes are plain floats, safe to translate or scale. The built props are quantized
 * (positions stored as normalized integers in [-1, 1]), so moving them in place clamps everything past 1.
 */
export function floatCopy(geometry: BufferGeometry): BufferGeometry {
  const copy = geometry.clone();
  for (const [name, attribute] of Object.entries(copy.attributes)) {
    if (attribute.array instanceof Float32Array && !attribute.normalized) continue;
    const data = new Float32Array(attribute.count * attribute.itemSize);
    for (let i = 0; i < attribute.count; i++)
      for (let k = 0; k < attribute.itemSize; k++) data[i * attribute.itemSize + k] = attribute.getComponent(i, k);
    copy.setAttribute(name, new BufferAttribute(data, attribute.itemSize));
  }
  return copy;
}
