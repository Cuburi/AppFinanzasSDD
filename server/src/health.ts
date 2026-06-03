import { Router, type RequestHandler } from "express";

type HealthDependencies = {
  checkDatabase: () => Promise<void>;
};

const databaseErrorMessage = (error: unknown) => (error instanceof Error ? error.message : "Database health check failed.");

export const createHealthRouter = ({ checkDatabase }: HealthDependencies) => {
  const router = Router();

  const handleHealth: RequestHandler = async (_request, response) => {
    try {
      await checkDatabase();
      response.json({ status: "ok", database: "ok" });
    } catch (error) {
      response.status(503).json({ status: "degraded", database: "error", message: databaseErrorMessage(error) });
    }
  };

  router.get("/health", handleHealth);
  router.get("/api/health", handleHealth);

  return router;
};
