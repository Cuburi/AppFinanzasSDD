import assert from "node:assert/strict";
import express from "express";
import test from "node:test";

import { createApp } from "./app.js";

const createTestServer = (app: ReturnType<typeof createApp>) => app.listen(0);

const request = async (server: ReturnType<typeof createTestServer>, path: string) => {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not bind to a port.");

  return fetch(`http://127.0.0.1:${address.port}${path}`);
};

test("createApp mounts the monthly-cycle module router under /api", async () => {
  const monthlyCycleRouter = express.Router();
  monthlyCycleRouter.get("/monthly-cycle-test", (_request, response) => {
    response.json({ source: "monthly-cycle-module" });
  });

  const server = createTestServer(
    createApp({
      health: { checkDatabase: async () => undefined },
      modules: {
        debts: { router: express.Router() },
        pockets: { router: express.Router() },
        monthlyCycle: { router: monthlyCycleRouter },
      },
    }),
  );

  try {
    const response = await request(server, "/api/monthly-cycle-test");

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { source: "monthly-cycle-module" });
  } finally {
    server.close();
  }
});
