// Writes contracts/game.schema.json from the TS types; `--check` only fails when the committed file is stale.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import { createGenerator } from "ts-json-schema-generator";

const ROOT_TYPES = [
  "GameCommand",
  "CommandResult",
  "GameErrorCode",
  "SnapshotMessage",
  "GameUpdateMessage",
  "ControllerMessage",
  "PartyHostMessage",
];

const frontendDir = fileURLToPath(new URL("../..", import.meta.url));
export const SCHEMA_PATH = fileURLToPath(new URL("../../../contracts/game.schema.json", import.meta.url));

export function buildSchema() {
  const generator = createGenerator({
    path: `${frontendDir}src/game/application/contract.ts`,
    tsconfig: `${frontendDir}tsconfig.game.json`,
    // One run per root, so `*` would miss the re-exported domain types.
    type: ROOT_TYPES[0],
    skipTypeCheck: true,
  });
  const definitions = {};
  for (const type of ROOT_TYPES) {
    for (const [name, definition] of Object.entries(generator.createSchema(type).definitions ?? {})) {
      if (name in definitions && !isDeepStrictEqual(definitions[name], definition)) {
        throw new Error(`Two different definitions named ${name}`);
      }
      definitions[name] = definition;
    }
  }
  const sorted = Object.fromEntries(Object.entries(definitions).sort(([a], [b]) => a.localeCompare(b)));
  return `${JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", definitions: sorted }, null, 2)}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const schema = buildSchema();
  if (process.argv.includes("--check")) {
    if (readFileSync(SCHEMA_PATH, "utf8") !== schema) {
      console.error("contracts/game.schema.json is stale: run `npm run schema` and commit it.");
      process.exit(1);
    }
  } else {
    writeFileSync(SCHEMA_PATH, schema);
  }
}
