/**
 * gnap-auth.js
 *
 * Manages the GNAP (Grant Negotiation and Authorization Protocol) lifecycle:
 *  - Initiating interactive grants
 *  - Continuing / finishing grants after user interaction
 *  - Rotating access tokens when they approach expiry
 */

"use strict";

const { createAuthenticatedClient } = require("@interledger/open-payments");
const keyConfig = require("../config/keys");
const { Mandate } = require("../models");

async function getClient() {
  return createAuthenticatedClient({
    walletAddressUrl: process.env.WALLET_ADDRESS,
    privateKey: keyConfig.privateKeyBuffer,
    keyId: process.env.KEY_ID,
  });
}

/**
 * Start an interactive GNAP grant for the given wallet address.
 * Returns the redirect URL the user must visit to approve the mandate.
 *
 * @param {string} walletAddressUrl
 * @param {{ debitAmountCents?: number, currency?: string, interval?: string }} [opts]
 *   - debitAmountCents: spending cap in cents (e.g. 8000 for $80/month)
 *   - currency: ISO 4217 code, defaults to USD
 *   - interval: ISO 8601 repeating interval e.g. "R/2026-06-25T00:00:00Z/P1M"
 *               When provided the wallet enforces a per-period spending cap.
 *               Omit for a standard open-ended outgoing-payment grant.
 * @returns {Promise<{ interactRedirectUrl: string, continueToken: string }>}
 */
async function initiateGrant(walletAddressUrl, opts = {}) {
  const client = await getClient();
  const walletAddress = await client.walletAddress.get({ url: walletAddressUrl });

  // Build access limits — include interval + debitAmount for static recurring subscriptions
  const accessEntry = {
    type: "outgoing-payment",
    actions: ["create", "read", "list"],
    identifier: walletAddressUrl,
  };

  if (opts.interval) {
    accessEntry.limits = {
      ...(opts.debitAmountCents != null && {
        debitAmount: {
          value: String(opts.debitAmountCents),
          assetCode: opts.currency ?? "USD",
          assetScale: 2,
        },
      }),
      interval: opts.interval,
    };
  }

  const grant = await client.grant.request(
    { url: walletAddress.authServer },
    {
      access_token: { access: [accessEntry] },
      interact: {
        start: ["redirect"],
        finish: {
          method: "redirect",
          uri: `${process.env.BACKEND_PUBLIC_URL ?? "http://localhost:4001"}/api/grants/callback`,
          nonce: _generateNonce(),
        },
      },
    }
  );

  if (!("interact" in grant)) {
    throw new Error("Expected an interactive grant response");
  }

  return {
    interactRedirectUrl: grant.interact.redirect,
    continueToken: grant.continue.access_token.value,
  };
}

/**
 * Exchange an interact_ref for a usable access token and persist the mandate.
 *
 * @param {{ interactRef: string, hash: string, continueToken: string }} params
 */
async function continueGrant({ interactRef, hash, continueToken }) {
  const client = await getClient();

  const finalGrant = await client.grant.continue(
    { url: `${process.env.RAFIKI_AUTH_URL}/continue`, accessToken: continueToken },
    { interact_ref: interactRef }
  );

  // Persist the mandate / access token in the database
  await Mandate.upsert({
    accessToken: finalGrant.access_token.value,
    expiresAt: finalGrant.access_token.expires_in
      ? new Date(Date.now() + finalGrant.access_token.expires_in * 1000)
      : null,
    manageUrl: finalGrant.access_token.manage,
  });

  return finalGrant;
}

/**
 * Rotate an expiring access token using its manage URL.
 *
 * @param {string} manageUrl
 * @param {string} oldToken
 */
async function rotateToken(manageUrl, oldToken) {
  const client = await getClient();
  const rotated = await client.token.rotate({ url: manageUrl, accessToken: oldToken });

  await Mandate.update(
    {
      accessToken: rotated.access_token.value,
      expiresAt: rotated.access_token.expires_in
        ? new Date(Date.now() + rotated.access_token.expires_in * 1000)
        : null,
    },
    { where: { accessToken: oldToken } }
  );

  return rotated;
}

function _generateNonce() {
  return require("crypto").randomBytes(16).toString("hex");
}

module.exports = { initiateGrant, continueGrant, rotateToken };
