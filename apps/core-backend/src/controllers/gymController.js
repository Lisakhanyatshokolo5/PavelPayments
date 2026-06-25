/**
 * gymController.js
 *
 * Handles all gym-related API endpoints:
 *  - POST /api/gym/tap-in           — record gym entry
 *  - POST /api/gym/tap-out          — record gym exit
 *  - GET  /api/gym/session/:uid     — current session status + today's minutes
 *  - POST /api/gym/subscribe        — initiate a gym subscription (GNAP flow)
 *  - GET  /api/gym/subscriptions/:uid — list active subscriptions for a user
 *
 * Pricing constants (cents) are imported from billing.js so they can be
 * displayed on the frontend without a separate API call.
 */

"use strict";

const gymSessionService = require("../services/gym-session");
const gnapAuthService = require("../services/gnap-auth");
const billingService = require("../services/billing");
const { User, Subscription, Mandate } = require("../models");

// ── Tap In ────────────────────────────────────────────────────────────────────

/**
 * POST /api/gym/tap-in
 * Body: { uid: string, terminalId?: string }
 */
async function tapIn(req, res) {
  const { uid, terminalId = "gym-door-1" } = req.body;
  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ error: "uid is required" });
  }

  try {
    const session = await gymSessionService.tapIn({ nfcUid: uid, terminalId });
    res.status(201).json({ session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ── Tap Out ───────────────────────────────────────────────────────────────────

/**
 * POST /api/gym/tap-out
 * Body: { uid: string, terminalId?: string }
 */
async function tapOut(req, res) {
  const { uid, terminalId = "gym-door-1" } = req.body;
  if (!uid || typeof uid !== "string") {
    return res.status(400).json({ error: "uid is required" });
  }

  try {
    const session = await gymSessionService.tapOut({ nfcUid: uid, terminalId });
    res.status(200).json({ session });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ── Session Status ────────────────────────────────────────────────────────────

/**
 * GET /api/gym/session/:uid
 * Returns the open session (if any) and today's accumulated minutes.
 * Also includes estimated charge so the UI can display a live preview.
 */
async function getSession(req, res) {
  const { uid } = req.params;
  if (!uid) return res.status(400).json({ error: "uid is required" });

  try {
    const { currentSession, todayMinutes, peakMinutes, user } =
      await gymSessionService.getSessionStatus({ nfcUid: uid });

    // Find the user's active gym subscription for the charge preview
    const subscription = await Subscription.findOne({
      where: { userId: user.id, serviceType: "gym", isActive: true },
      order: [["createdAt", "DESC"]],
    });

    let estimatedCharge = null;
    if (subscription && todayMinutes > 0) {
      const result =
        subscription.subscriptionType === "dynamic"
          ? billingService.calculateGymDynamicCharge({
              tier: subscription.tier,
              totalMinutes: todayMinutes,
              peakMinutes,
              currency: user.preferredCurrency ?? "USD",
            })
          : billingService.calculateGymStaticCharge({
              tier: subscription.tier,
              currency: user.preferredCurrency ?? "USD",
            });
      estimatedCharge = result;
    }

    res.json({
      currentSession,
      todayMinutes,
      peakMinutes,
      estimatedCharge,
      subscription: subscription
        ? { tier: subscription.tier, subscriptionType: subscription.subscriptionType }
        : null,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// ── Subscribe ─────────────────────────────────────────────────────────────────

/**
 * POST /api/gym/subscribe
 * Body: {
 *   walletAddress: string,
 *   nfcUid: string,
 *   subscriptionType: "dynamic" | "static",
 *   tier: "daily" | "weekly" | "monthly" | "yearly"
 * }
 *
 * Initiates a GNAP grant and creates a pending Subscription record.
 * The Subscription is activated when the GNAP callback fires.
 */
async function subscribe(req, res) {
  const { walletAddress, nfcUid, subscriptionType = "dynamic", tier = "daily" } = req.body;

  if (!walletAddress || !nfcUid) {
    return res.status(400).json({ error: "walletAddress and nfcUid are required" });
  }
  if (!["dynamic", "static"].includes(subscriptionType)) {
    return res.status(400).json({ error: "subscriptionType must be dynamic or static" });
  }
  if (!["daily", "weekly", "monthly", "yearly"].includes(tier)) {
    return res.status(400).json({ error: "tier must be daily, weekly, monthly, or yearly" });
  }

  try {
    // Upsert user
    let user = await User.findOne({ where: { nfcUid } });
    if (!user) {
      user = await User.create({ nfcUid, walletAddress });
    } else if (!user.walletAddress) {
      await user.update({ walletAddress });
    }

    // Determine base rate
    const baseRateCents =
      subscriptionType === "dynamic"
        ? billingService.GYM_DYNAMIC_BASE[tier]
        : billingService.GYM_STATIC_BASE[tier];

    // For static weekly+, add an interval limit to the GNAP grant so the
    // wallet provider enforces the per-period spending cap.
    let grantOpts = {};
    if (subscriptionType === "static" && tier !== "daily") {
      const intervalMap = { weekly: "P1W", monthly: "P1M", yearly: "P1Y" };
      const startISO = new Date().toISOString().split(".")[0] + "Z";
      grantOpts = {
        debitAmountCents: baseRateCents,
        currency: user.preferredCurrency ?? "USD",
        interval: `R/${startISO}/${intervalMap[tier]}`,
      };
    }

    const { interactRedirectUrl, continueToken } = await gnapAuthService.initiateGrant(
      walletAddress,
      grantOpts
    );

    // Create a pending subscription (isActive: false until callback)
    const today = new Date().toISOString().slice(0, 10);
    const sub = await Subscription.create({
      userId: user.id,
      serviceType: "gym",
      subscriptionType,
      tier,
      baseRateCents,
      startDate: today,
      nextBillingDate: today,
      isActive: false,
    });

    // Store the continue token in the session cookie (reuse existing pattern)
    res.cookie("gnap_continue_token", continueToken, { httpOnly: true, sameSite: "lax" });
    // Store the pending subscription ID so the callback can activate it
    res.cookie("pending_subscription_id", sub.id, { httpOnly: true, sameSite: "lax" });

    res.json({ interactRedirectUrl, subscriptionId: sub.id });
  } catch (err) {
    console.error("[gym/subscribe]", err);
    res.status(500).json({ error: err.message });
  }
}

// ── List Subscriptions ────────────────────────────────────────────────────────

/**
 * GET /api/gym/subscriptions/:uid
 */
async function listSubscriptions(req, res) {
  const { uid } = req.params;
  if (!uid) return res.status(400).json({ error: "uid is required" });

  try {
    const user = await User.findOne({ where: { nfcUid: uid } });
    if (!user) return res.json({ subscriptions: [] });

    const subscriptions = await Subscription.findAll({
      where: { userId: user.id, isActive: true },
      order: [["createdAt", "DESC"]],
    });

    res.json({ subscriptions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Pricing Info ──────────────────────────────────────────────────────────────

/**
 * GET /api/gym/pricing
 * Returns all rate constants so the frontend can render a pricing table
 * without hardcoding values.
 */
function getPricing(_req, res) {
  res.json({
    dynamic: billingService.GYM_DYNAMIC_BASE,
    static: billingService.GYM_STATIC_BASE,
    currency: "USD",
    assetScale: 2,
    peakHours: ["06:00–09:00", "17:00–20:00"],
    maxDurationDiscountMinutes: 120,
    maxDurationDiscountPercent: 50,
  });
}

// ── History ───────────────────────────────────────────────────────────────────

/**
 * GET /api/gym/history/:uid
 * Returns all DailySettlement records for a user across both gym and streaming.
 */
async function getHistory(req, res) {
  const { uid } = req.params;
  if (!uid) return res.status(400).json({ error: "uid is required" });

  try {
    const { DailySettlement } = require("../models");
    const user = await User.findOne({ where: { nfcUid: uid } });
    if (!user) return res.json({ settlements: [] });

    const settlements = await DailySettlement.findAll({
      where: { userId: user.id },
      order: [["settlementDate", "DESC"]],
      limit: 90,
    });

    res.json({ settlements });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { tapIn, tapOut, getSession, subscribe, listSubscriptions, getPricing, getHistory };
