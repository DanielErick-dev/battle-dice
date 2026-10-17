import { useCallback, useState, type SetStateAction } from "react";

/**
 * useState that falls back to `initial` whenever `key` changes (whose turn it is): a choice left
 * half-made on one player's turn doesn't carry over to the next player's.
 */
export function useTurnState<T>(initial: T, key: string | null): [T, (next: SetStateAction<T>) => void] {
  const [state, setState] = useState<{ key: string | null; value: T }>({
    key,
    value: initial,
  });
  const value = state.key === key ? state.value : initial;
  const set = useCallback(
    (next: SetStateAction<T>) =>
      setState((current) => {
        const previous = current.key === key ? current.value : initial;
        return { key, value: next instanceof Function ? next(previous) : next };
      }),
    // `initial` is a constant at every call site.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );
  return [value, set];
}
