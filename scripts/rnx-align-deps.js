#!/usr/bin/env node

import { URL, fileURLToPath } from "node:url";
// Directly import align-deps to avoid circular dependency
import { cli } from "../packages/align-deps/lib/index.js";

cli({
  presets: [
    "microsoft/react-native",
    fileURLToPath(new URL("align-deps-preset.cjs", import.meta.url)),
  ],
  requirements: ["react-native@0.79"],
  write: process.argv.includes("--write"),
});
