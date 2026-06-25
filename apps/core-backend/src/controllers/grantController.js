/**
 * grantController.js
 *
 * POST /api/grants/initiate  — start a GNAP grant request for a wallet address
 * GET  /api/grants/callback  — handle the wallet's redirect after user consent
 */

"use strict";

const gnapAuthService = require("../services/gnap-auth");

/**
 * Initiate a GNAP interactive grant.
 * Returns the URL the user should be redirected to for consent.
 */
async function initiateGrant(req, res) {
  const { walletAddress } = req.body;

  if (!walletAddress || typeof walletAddress !== "string") {
    return res.status(400).json({ message: "walletAddress is required" });
  }

  try {
    const { interactRedirectUrl, continueToken } = await gnapAuthService.initiateGrant(walletAddress);

    // Store continueToken in session/DB (here simplified as a response cookie)
    res.cookie("gnap_continue_token", continueToken, { httpOnly: true, sameSite: "lax" });

    return res.json({ interactRedirectUrl });
  } catch (err) {
    console.error("[grantController] initiateGrant error:", err);
    return res.status(500).json({ message: "Grant initiation failed", error: err.message });
  }
}

/**
 * Handle the wallet redirect after the user approves/denies the mandate.
 * Exchanges the interact_ref for a usable access token, then activates
 * any pending subscription that was created alongside the grant.
 */
async function handleCallback(req, res) {
  const { interact_ref, hash } = req.query;
  const continueToken = req.cookies?.gnap_continue_token;
  const pendingSubscriptionId = req.cookies?.pending_subscription_id;

  if (!interact_ref || !continueToken) {
    return res.status(400).json({ message: "Missing interact_ref or continue token" });
  }

  try {
    const finalGrant = await gnapAuthService.continueGrant({
      interactRef: interact_ref,
      hash,
      continueToken,
    });

    // Activate the pending subscription now that the mandate is confirmed
    if (pendingSubscriptionId) {
      const { Subscription, Mandate } = require("../models");
      const mandate = await Mandate.findOne({ order: [["createdAt", "DESC"]] });
      if (mandate && pendingSubscriptionId) {
        await Subscription.update(
          { isActive: true, mandateId: mandate.id },
          { where: { id: pendingSubscriptionId } }
        );
      }
      res.clearCookie("pending_subscription_id");
    }

    res.clearCookie("gnap_continue_token");

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    return res.redirect(`${frontendUrl}/dashboard?granted=true`);
  } catch (err) {
    console.error("[grantController] handleCallback error:", err);
    return res.status(500).json({ message: "Grant continuation failed", error: err.message });
  }
}

module.exports = { initiateGrant, handleCallback };
