import type { CopyEntries } from "./types";

/** Vinicius's hoe. */
export const viniciusCopy = {
  weeded: {
    title: "CAPINOU!",
    tone: "text-amber-300",
    subtitle: (_, name) => `${name} arrancou a armadilha pela raiz`,
  },
} satisfies CopyEntries;
