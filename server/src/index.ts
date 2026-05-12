import "./load-env.js";
import express from "express";

import { monthlyCycleRouter } from "./modules/monthly-cycle/routes.js";

const app = express();
const port = Number(process.env.PORT ?? 3001);

app.use(express.json());
app.use("/api", monthlyCycleRouter());

app.get("/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`AppFinanzas server listening on http://localhost:${port}`);
});
