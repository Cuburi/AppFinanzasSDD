import express from "express";
import type { Router } from "express";

import { createHealthRouter } from "./health.js";

type HealthDependencies = Parameters<typeof createHealthRouter>[0];

type AppModule = {
  router: Router;
};

type CreateAppOptions = {
  health: HealthDependencies;
  modules: {
    debts: AppModule;
    pockets: AppModule;
    creditCards?: AppModule;
    monthlyCycle: AppModule;
  };
};

export const createApp = ({ health, modules }: CreateAppOptions) => {
  const app = express();

  app.use(express.json());
  app.use(createHealthRouter(health));
  app.use("/api", modules.debts.router);
  app.use("/api", modules.pockets.router);
  if (modules.creditCards) app.use("/api", modules.creditCards.router);
  app.use("/api", modules.monthlyCycle.router);

  return app;
};
