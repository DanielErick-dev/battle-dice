const effectKeys = new WeakMap<object, number>();
let nextEffectKey = 0;

/** A fresh key per effect object shown, so each one plays from the start. */
export function effectKey(effect: object): number {
  let key = effectKeys.get(effect);
  if (key === undefined) {
    key = nextEffectKey++;
    effectKeys.set(effect, key);
  }
  return key;
}
