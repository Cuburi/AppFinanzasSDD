import { prisma } from "../../lib/prisma.js";
import { createCreatePocketUseCase } from "./application/use-cases/create-pocket-use-case.js";
import { createDeactivatePocketUseCase } from "./application/use-cases/deactivate-pocket-use-case.js";
import { createGetPocketUseCase } from "./application/use-cases/get-pocket-use-case.js";
import { createListPocketsUseCase } from "./application/use-cases/list-pockets-use-case.js";
import { createUpdatePocketUseCase } from "./application/use-cases/update-pocket-use-case.js";
import { createPocketsRouter } from "./http/pockets.routes.js";
import { createPocketPrismaRepository } from "./infrastructure/prisma/pocket-prisma-repository.js";

type PrismaPocketsModuleDb = typeof prisma;

export const createPocketsModule = (db: PrismaPocketsModuleDb = prisma) => {
  const pockets = createPocketPrismaRepository(db as unknown as Parameters<typeof createPocketPrismaRepository>[0]);

  const service = {
    listPockets: createListPocketsUseCase({ pockets }),
    getPocket: createGetPocketUseCase({ pockets }),
    createPocket: createCreatePocketUseCase({ pockets }),
    updatePocket: createUpdatePocketUseCase({ pockets }),
    deactivatePocket: createDeactivatePocketUseCase({ pockets }),
  };

  return {
    router: createPocketsRouter(service),
    service,
  };
};
