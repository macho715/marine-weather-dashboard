import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/server/**/*.ts", "app/api/**/*.ts"],
      exclude: [
        "lib/server/ioi.ts",
        "lib/server/report-state.ts",
        "lib/server/vessel-data.ts",
        "app/api/health/**",
        "app/api/vessel/**",
      ],
      thresholds: {
        lines: 70,
        statements: 70,
      },
    },
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
