import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  pack: {
    entry: [
      "src/index.ts",
      "src/config.ts",
      "src/fields.ts",
      "src/production.ts",
      "src/otlp.ts",
      "src/elysia.ts",
      "src/tanstack-start.ts",
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
