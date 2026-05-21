export type WidekitConfig = {
  readonly axiom: {
    readonly tokenEnv: string;
    readonly datasetEnv: string;
    readonly endpoint?: string | undefined;
  };
  readonly service: {
    readonly versionEnv: string;
    readonly environmentEnv: string;
  };
  readonly sampling: {
    readonly successRate: number;
    readonly slowDurationMs: number;
  };
};

export const standardConfig = {
  axiom: {
    tokenEnv: "AXIOM_TOKEN",
    datasetEnv: "AXIOM_DATASET",
  },
  service: {
    versionEnv: "APP_VERSION",
    environmentEnv: "NODE_ENV",
  },
  sampling: {
    successRate: 1,
    slowDurationMs: 1000,
  },
} as const satisfies WidekitConfig;
