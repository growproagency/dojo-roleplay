import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  root: import.meta.dirname,
  test: {
    environment: "node",
    include: ["**/*.test.js", "**/*.spec.js"],
  },
});
