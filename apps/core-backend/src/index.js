/**
 * index.js — core-backend Express server entry point
 */

"use strict";

require("dotenv").config({ path: "../../../.env" });
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const cron = require("node-cron");

const paymentController = require("./controllers/paymentController");
const grantController = require("./controllers/grantController");
const transactionController = require("./controllers/transactionController");
const gymController = require("./controllers/gymController");
const streamingController = require("./controllers/streamingController");
const settlement = require("./services/settlement");

const app = express();
const PORT = process.env.BACKEND_PORT ?? 4001;

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ── Existing routes ───────────────────────────────────────────────────────────
app.post("/api/trigger-payment", paymentController.triggerPayment);
app.post("/api/grants/initiate", grantController.initiateGrant);
app.get("/api/grants/callback", grantController.handleCallback);
app.get("/api/transactions", transactionController.listTransactions);

// ── Gym routes ────────────────────────────────────────────────────────────────
app.post("/api/gym/tap-in", gymController.tapIn);
app.post("/api/gym/tap-out", gymController.tapOut);
app.get("/api/gym/session/:uid", gymController.getSession);
app.post("/api/gym/subscribe", gymController.subscribe);
app.get("/api/gym/subscriptions/:uid", gymController.listSubscriptions);
app.get("/api/gym/pricing", gymController.getPricing);
app.get("/api/gym/history/:uid", gymController.getHistory);

// ── Streaming routes ──────────────────────────────────────────────────────────
app.post("/api/stream/start", streamingController.startStream);
app.post("/api/stream/end", streamingController.endStream);
app.get("/api/stream/session/:uid", streamingController.getSession);
app.post("/api/stream/subscribe", streamingController.subscribe);
app.get("/api/stream/subscriptions/:uid", streamingController.listSubscriptions);
app.get("/api/stream/pricing", streamingController.getPricing);

// ── JWKS endpoint ─────────────────────────────────────────────────────────────
app.get("/jwks.json", (req, res) => {
  const keyConfig = require("./config/keys");
  res.json(keyConfig.publicJwks);
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Manual settlement trigger (dev/testing only) ──────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.post("/api/dev/settle-now", async (_req, res) => {
    try {
      await settlement.runDailySettlement();
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// ── Midnight settlement cron ──────────────────────────────────────────────────
// Runs at 00:00 every day in the server's local timezone.
cron.schedule("0 0 * * *", () => {
  settlement.runDailySettlement().catch((err) => {
    console.error("[cron] Settlement failed:", err);
  });
});

// ── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[core-backend] Listening on http://localhost:${PORT}`);
  console.log(`[cron] Daily settlement scheduled for 00:00`);
});

module.exports = app;
