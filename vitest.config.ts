import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // Vitest does not read tsconfig `paths`, so the `@/` alias Next understands
  // has to be repeated here. Without it the test run fails at import time with
  // "Failed to load url @/…", which reads like a missing file rather than a
  // missing alias and costs a contributor a confusing ten minutes.
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    // The logic worth testing is all pure functions over plain data, so there
    // is no jsdom environment and no setup file to keep in sync.
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
