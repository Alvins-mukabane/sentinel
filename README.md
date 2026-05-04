# AIMA Cloud SIEM

This repository contains the AIMA Cloud SIEM, an AI-driven Incident Response Agent that correlates Sentry errors with GitHub workflow failures. It provides a secure dashboard for analyzing application crashes and deployment issues in real-time.

## Local Development Setup

To run this project locally with your custom agent, Supabase, and Vercel:

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Copy `.env.example` to `.env` and fill in the values:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key
   WEBHOOK_SECRET=your_secure_webhook_secret
   DASHBOARD_PASSWORD=your_dashboard_password
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   This will start both the Express backend and the Vite frontend on exactly the same port (3000 by default in AI Studio, customizable in your local setup).

## Webhook Endpoints

Your agent or external services (like GitHub Actions, Sentry, Vercel, or Supabase Edge Functions) should send POST requests to these endpoints:

- **Sentry Webhooks:** `/api/webhooks/sentry`
- **GitHub Webhooks:** `/api/webhooks/github`

**Authentication:** Include the `WEBHOOK_SECRET` in the Authorization header:
```
Authorization: Bearer <WEBHOOK_SECRET>
```

## Architecture

- **Frontend:** React + Vite + Tailwind CSS + Recharts
- **Backend:** Express.js + SQLite (for local persistence of webhooks) + Model Context Protocol (MCP) tool endpoints.
- **AI Engine:** Google Gemini Pro via `@google/genai` TypeScript SDK. The AI correlates logs, identifies issues, and provides actionable insights.

## Note for Local Agents
The core agent logic runs in `src/services/geminiService.ts` and `src/hooks/useAnalysisLoop.ts`. The AI uses MCP-style endpoints (e.g., `/api/mcp/analyze_sentry_trace`) to fetch the latest telemetry data from the local SQLite database. You can extend `geminiService.ts` to include tools for querying your Supabase database or Vercel deployment logs directly.
