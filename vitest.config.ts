import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: [
        "lib/server/notifier.ts",
        "lib/server/guarded-fetch.ts",
        "lib/server/ioi.ts",
        "app/api/marine/route.ts",
        "app/api/report/route.ts",
        "app/api/briefing/route.ts",
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
