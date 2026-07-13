import "./load-env.js";

import { createApp } from "./app.js";
import { prisma } from "./lib/prisma.js";
import { createCreditCardsModule } from "./modules/credit-cards/credit-cards.module.js";
import { createDebtsModule } from "./modules/debts/debts.module.js";
import { createMonthlyCycleModule } from "./modules/monthly-cycle/monthly-cycle.module.js";
import { createPocketsModule } from "./modules/pockets/pockets.module.js";

const port = Number(process.env.PORT ?? 3001);

const app = createApp({
  health: {
    async checkDatabase() {
      await prisma.$queryRaw`SELECT 1`;
    },
  },
  modules: {
    debts: createDebtsModule(),
    pockets: createPocketsModule(),
    creditCards: createCreditCardsModule(),
    monthlyCycle: createMonthlyCycleModule(),
  },
});

app.listen(port, () => {
  console.log(`AppFinanzas server listening on http://localhost:${port}`);
});
