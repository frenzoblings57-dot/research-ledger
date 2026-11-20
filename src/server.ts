import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runResearch } from "./research.js";
import { getPocketConfig } from "./pocket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "32kb" }));
app.use(express.static(path.join(root, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "crypto-research-assistant", pocket: getPocketConfig() });
});

app.get("/api/config", (_req, res) => {
  res.json({ pocket: getPocketConfig(), workflow: { maxSources: 2, operationsPerRun: "1 search + up to 2 extracts" } });
});

app.post("/api/research", async (req, res) => {
  const topic = typeof req.body?.topic === "string" ? req.body.topic.trim() : "";
  if (topic.length < 3 || topic.length > 240) {
    res.status(400).json({ error: "Enter a topic between 3 and 240 characters." });
    return;
  }
  try {
    const result = await runResearch(topic);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Research run failed." });
  }
});

app.use((_req, res) => {
  res.sendFile(path.join(root, "public", "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Crypto Research Assistant listening on 0.0.0.0:${port}`);
});
