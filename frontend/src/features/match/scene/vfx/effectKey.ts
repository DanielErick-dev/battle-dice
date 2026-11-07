const effectKeys = new WeakMap<object, number>();
let nextEffectKey = 0;

/** A fresh key per effect object shown, so each one plays from the start. */
export function effectKey(effect: object): number {
  if (!effectKeys.has(effect)) effectKeys.set(effect, nextEffectKey++);
  return effectKeys.get(effect)!;
}
