import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import sqlite3 from "sqlite3";

// Initialize SQLite Database local file
const db = new sqlite3.Database("siem.db", (err) => {
  if (err) {
    console.error("Error opening database " + err.message);
  } else {
    // Create logs table if it doesn't exist
    db.run(
      `CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        timestamp TEXT,
        data TEXT
      )`,
      (err) => {
        if (err) {
          console.error("Error creating logs table", err);
        }
      }
    );
  }
});

// Helper function to insert logs
function insertLog(source: string, data: any) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().toISOString();
    db.run(
      `INSERT INTO logs (source, timestamp, data) VALUES (?, ?, ?)`,
      [source, timestamp, JSON.stringify(data)],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Helper function to get recent logs
function getRecentLogs(source: string, limit = 10) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM logs WHERE source = ? ORDER BY id DESC LIMIT ?`,
      [source, limit],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map((row: any) => ({ ...row, data: JSON.parse(row.data) })));
      }
    );
  });
}

// Mock Webhook Data as fallback context for AI
const MOCK_WEBHOOK_DATA = {
  sentry: [
    { event_id: "a1b2c3", project: "eva-webapp", level: "error", message: "TypeError: Cannot read properties of undefined (reading 'map')", timestamp: "2026-05-02T22:30:10Z", culpit: "src/utils/parser.js", environment: "production", tags: { browser: "Chrome 124", os: "Windows 11" }, user: { id: "user_88", email: "adamsaura38@gmail.com", impact: "fatal" }, breadcrumbs: [{ type: "navigation", message: "navigated to /dashboard", timestamp: "2026-05-02T22:29:50Z" }, { type: "click", message: "clicked span.submit", timestamp: "2026-05-02T22:30:05Z" }] },
    { event_id: "e5f6g7", project: "utg-api", level: "fatal", message: "ConnectionTimeoutError: Database pool exhausted", timestamp: "2026-05-02T22:38:05Z", env: "production", tags: { tier: "db", region: "europe-west2" }, user: { impact: "service_outage" } }
  ],
  github: [
    { workflow: "Production Deploy", status: "failure", repository: "useaima/eva", actor: "adamsaura", timestamp: "2026-05-02T19:12:00Z", log_tail: "Error: Process completed with exit code 1. Cannot resolve dependency 'lodash'." }
  ],
  github_commits: [
    { sha: "8f3b2a", author: "adamsaura", message: "refactor: updated parser.js mapping logic", timestamp: "2026-05-02T22:15:00Z", repo: "useaima/eva" },
    { sha: "1a2b3c", author: "adamsaura", message: "fix: database connection pool limit increased", timestamp: "2026-05-01T14:20:00Z", repo: "useaima/utg" }
  ]
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a secret token to secure webhook endpoints from being spammed
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "dev_secret";
  // Use a password to protect the SIEM APIs and dashboard
  const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || "admin123";

  app.use(express.json());

  // Simple auth middleware for webhooks
  const authenticateWebhook = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized Webhook Request" });
    }
    next();
  };

  // Simple auth middleware for frontend SIEM APIs
  const authenticateDashboard = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${DASHBOARD_PASSWORD}`) {
      return res.status(401).json({ error: "Unauthorized Dashboard Access" });
    }
    next();
  };

  // ==========================================
  // CLOUD SIEM WEBHOOKS (Sentry, GitHub)
  // These endpoints will receive realtime alerts from your apps
  // Configuration instructions will be provided in the UI
  // ==========================================

  app.post("/api/webhooks/sentry", authenticateWebhook, async (req, res) => {
    console.log("[WEBHOOK] Received Sentry Event");
    try {
      await insertLog('sentry', req.body);
      res.json({ status: "success", message: "Sentry log ingested locally" });
    } catch (e) {
      res.status(500).json({ error: "Database error" });
    }
  });

  app.post("/api/webhooks/github", authenticateWebhook, async (req, res) => {
    console.log("[WEBHOOK] Received GitHub Event");
    try {
      await insertLog('github', req.body);
      res.json({ status: "success", message: "GitHub log ingested locally" });
    } catch (e) {
      res.status(500).json({ error: "Database error" });
    }
  });

  // ==========================================
  // MCP SERVER BACKEND (AI AGENT ENDPOINTS)
  // Protected by the Dashboard Password
  // ==========================================

  app.post("/api/mcp/analyze_sentry_trace", authenticateDashboard, async (req, res) => {
    console.log("[MCP SERVER] Executing analyze_sentry_trace");
    try {
      const dbLogs: any = await getRecentLogs('sentry', 20);
      const data = dbLogs.length > 0 ? dbLogs : MOCK_WEBHOOK_DATA.sentry;
      res.json({
         tool: "analyze_sentry_trace",
         status: "success",
         records_found: data.length,
         data: data 
      });
    } catch (e) {
      res.status(500).json({ error: "Internal Error" });
    }
  });

  app.post("/api/mcp/analyze_github_workflow", authenticateDashboard, async (req, res) => {
    console.log("[MCP SERVER] Executing analyze_github_workflow");
    try {
      const dbLogs: any = await getRecentLogs('github', 20);
      const data = dbLogs.length > 0 ? dbLogs : MOCK_WEBHOOK_DATA.github;
      res.json({
        tool: "analyze_github_workflow",
        status: "success",
        records_found: data.length,
        data: data
      });
    } catch (e) {
      res.status(500).json({ error: "Internal Error" });
    }
  });

  app.post("/api/mcp/analyze_github_commits", authenticateDashboard, async (req, res) => {
    console.log("[MCP SERVER] Executing analyze_github_commits");
    try {
      // In a real app we'd fetch git history, defaulting to mock for now
      res.json({
        tool: "analyze_github_commits",
        status: "success",
        records_found: MOCK_WEBHOOK_DATA.github_commits.length,
        data: MOCK_WEBHOOK_DATA.github_commits
      });
    } catch (e) {
      res.status(500).json({ error: "Internal Error" });
    }
  });

  // ==========================================
  // Feedback endpoint
  // ==========================================
  app.post("/api/feedback", authenticateDashboard, (req, res) => {
    console.log("[API] Received user feedback on a finding", req.body);
    // In a real app we'd save this feedback to the database to fine-tune the model
    res.json({ success: true });
  });

  // ==========================================
  // Verify/Login Endpoint (Simple Password Check)
  // ==========================================
  app.post("/api/auth/login", (req, res) => {
    const { password } = req.body;
    if (password === DASHBOARD_PASSWORD) {
      res.json({ success: true, token: DASHBOARD_PASSWORD });
    } else {
      res.status(401).json({ success: false, error: "Invalid password" });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
