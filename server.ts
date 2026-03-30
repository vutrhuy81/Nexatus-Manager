import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { createServer as createViteServer } from "vite";
import cors from "cors";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CSV_FILE = path.join(__dirname, "dataset.csv");
const LOG_FILE = path.join(__dirname, "activity_log.csv");

async function writeLog(user: string, action: string, details: string) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, user, action, details };
  const exists = await fs.access(LOG_FILE).then(() => true).catch(() => false);
  const csvLine = stringify([logEntry], { header: !exists });
  await fs.appendFile(LOG_FILE, csvLine);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get("/api/data", async (req, res) => {
    try {
      const fileContent = await fs.readFile(CSV_FILE, "utf-8");
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
      res.json(records);
    } catch (error) {
      console.error("Error reading CSV:", error);
      res.status(500).json({ error: "Failed to read data" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { data: newData, user, action, details } = req.body;
      const output = stringify(newData, { header: true });
      await fs.writeFile(CSV_FILE, output);
      
      if (user && action) {
        await writeLog(user, action, details || "");
      }
      
      res.json({ message: "Data saved successfully" });
    } catch (error) {
      console.error("Error writing CSV:", error);
      res.status(500).json({ error: "Failed to save data" });
    }
  });

  app.get("/api/logs", async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }

    try {
      const exists = await fs.access(LOG_FILE).then(() => true).catch(() => false);
      if (!exists) return res.json([]);
      
      const fileContent = await fs.readFile(LOG_FILE, "utf-8");
      const logs = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
      });
      res.json(logs);
    } catch (error) {
      console.error("Error reading logs:", error);
      res.status(500).json({ error: "Failed to read logs" });
    }
  });

  app.get("/api/export/data", async (req, res) => {
    try {
      const content = await fs.readFile(CSV_FILE, "utf-8");
      const bom = "\uFEFF";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=dataset.csv");
      res.send(bom + content);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Export failed");
    }
  });

  app.get("/api/export/logs", async (req, res) => {
    const role = req.headers["x-user-role"];
    if (role !== "ADMIN") {
      return res.status(403).json({ error: "Unauthorized" });
    }
    try {
      const exists = await fs.access(LOG_FILE).then(() => true).catch(() => false);
      if (!exists) return res.status(404).send("Log file not found");
      
      const content = await fs.readFile(LOG_FILE, "utf-8");
      const bom = "\uFEFF";
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=activity_log.csv");
      res.send(bom + content);
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).send("Export failed");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
