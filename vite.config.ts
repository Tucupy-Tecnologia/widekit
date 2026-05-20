import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/fields.ts",
      "src/production.ts",
      "src/sinks.ts",
      "src/axiom.ts",
      "src/otlp.ts",
      "src/elysia.ts",
      "src/tanstack-start.ts",
      "src/bun.ts",
    ],
    dts: {
      tsgo: true,
    },
    deps: {
      skipNodeModulesBundle: true,
    },
    exports: true,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
