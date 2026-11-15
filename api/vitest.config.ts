import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // The env has to be in place before any test file imports config.ts,
    // which reads it once at module load.
    setupFiles: ["./test/setup.ts"],
    // One mongod, shared: starting a server per file is most of the runtime.
    fileParallelism: false,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
