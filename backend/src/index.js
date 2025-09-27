import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { optionsRouter } from "./routes/options.js";
import { contractsRouter } from "./routes/contracts.js";
import { layeredOptionsRouter } from "./routes/layeredOptions.js";
import { indexer } from "./services/indexer.js";
import { layeredIndexer } from "./services/layeredIndexer.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "Citrea Options Backend",
  });
});

// Routes
app.use("/api/options", optionsRouter);
app.use("/api/contracts", contractsRouter);
app.use("/api/layered-options", layeredOptionsRouter);

// Start indexers
indexer.start();
layeredIndexer.start();

app.listen(PORT, () => {
  console.log(`🚀 Citrea Options Backend running on port ${PORT}`);
  console.log(`📊 Indexer started - watching for options on chain`);
});

export default app;
