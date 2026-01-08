import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests serially to avoid authentication conflicts
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Timeout for integration tests (30 seconds)
    testTimeout: 30000,
    
    // Include only integration tests
    include: ["tests/integration/**/*.test.ts"],
    
    // Globals like describe, test, expect
    globals: true,
    
    // Coverage configuration (optional)
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["tests/**"],
    },
  },
});
