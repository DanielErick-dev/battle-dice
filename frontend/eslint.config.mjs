import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// game/ is pure rules, so the same code can run on the server; see docs/arquitetura.md.
const GAME_FORBIDDEN = [
  {
    group: ["**/features", "**/features/**", "**/app/**", "**/components/**"],
    message: "game/ can't depend on the presentation layer.",
  },
  {
    group: ["react", "react/*", "react-dom", "react-dom/*", "next", "next/*", "three", "three/*", "@react-three/*"],
    message: "game/ is pure TypeScript: no React, Next or Three.js.",
  },
];

const noGameImports = (patterns) => ["error", { patterns }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/game/**"],
    rules: { "no-restricted-imports": noGameImports(GAME_FORBIDDEN) },
  },
  {
    files: ["src/game/domain/**"],
    rules: {
      "no-restricted-imports": noGameImports([
        ...GAME_FORBIDDEN,
        { group: ["**/application", "**/application/**"], message: "The domain can't depend on game/application." },
      ]),
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
