import "./load-env.js";
import express from "express";

import { createHealthRouter } from "./health.js";
import { prisma } from "./lib/prisma.js";
import { createDebtsModule } from "./modules/debts/debts.module.js";
import { monthlyCycleRouter } from "./modules/monthly-cycle/routes.js";
import { pocketsRouter } from "./modules/pockets/routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use(
  createHealthRouter({
    async checkDatabase() {
      await prisma.$queryRaw`SELECT 1`;
    },
  }),
);
app.use("/api", createDebtsModule().router);
app.use("/api", pocketsRouter());
app.use("/api", monthlyCycleRouter());

app.listen(port, () => {
  console.log(`AppFinanzas server listening on http://localhost:${port}`);
});
