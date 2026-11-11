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

// A replayable engine draws only from state.rng and never reads the clock or the browser.
const IMPURE = "game/ must stay deterministic: take randomness from state.rng and time from the caller.";
const GAME_IMPURE_RULES = {
  "no-restricted-globals": [
    "error",
    { name: "window", message: IMPURE },
    { name: "document", message: IMPURE },
    { name: "performance", message: IMPURE },
  ],
  "no-restricted-properties": [
    "error",
    { object: "Math", property: "random", message: IMPURE },
    { object: "Date", property: "now", message: IMPURE },
    { object: "performance", property: "now", message: IMPURE },
  ],
  "no-restricted-syntax": [
    "error",
    { selector: "NewExpression[callee.name='Date']", message: IMPURE },
    { selector: "CallExpression[callee.name='Date']", message: IMPURE },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/game/**"],
    rules: { "no-restricted-imports": noGameImports(GAME_FORBIDDEN), ...GAME_IMPURE_RULES },
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
