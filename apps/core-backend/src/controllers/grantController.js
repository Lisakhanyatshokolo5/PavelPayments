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
    const { interactRedirectUrl } = await gnapAuthService.initiateGrant(walletAddress);
    // stateId is embedded in the finish URI — no cookies needed.
    return res.json({ interactRedirectUrl });
  } catch (err) {
    console.error("[grantController] initiateGrant error:", err);
    return res.status(500).json({ message: "Grant initiation failed", error: err.message });
  }
}

/**
 * Handle the wallet redirect after the user approves/denies the mandate.
 * The stateId in ?state= lets us look up the continue token from a server-side store,
 * avoiding the cross-site cookie problem entirely.
 */
async function handleCallback(req, res) {
  const { interact_ref, hash, state } = req.query;

  if (!interact_ref || !state) {
    console.error("[grantController] callback missing params:", { interact_ref: !!interact_ref, state: !!state });
    return res.status(400).json({ message: "Missing interact_ref or state in callback URL" });
  }

  const grantState = gnapAuthService.lookupGrantState(state);
  if (!grantState) {
    console.error("[grantController] unknown or expired state:", state);
    return res.status(400).json({ message: "Grant state not found or expired. Please restart the connect flow." });
  }

  const { continueToken, continueUri } = grantState;

  try {
    await gnapAuthService.continueGrant({
      interactRef: interact_ref,
      hash,
      continueToken,
      continueUri,
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
    return res.redirect(`${frontendUrl}/Dashboard?granted=true`);
  } catch (err) {
    console.error("[grantController] handleCallback error:", err);
    return res.status(500).json({ message: "Grant continuation failed", error: err.message });
  }
}

module.exports = { initiateGrant, handleCallback };
