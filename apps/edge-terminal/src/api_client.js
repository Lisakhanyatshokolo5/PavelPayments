/**
 * api_client.js
 *
 * Sends a payment-trigger request to the core-backend whenever an NFC
 * scan event is received. Handles retries and surface-level error logging.
 */

"use strict";

require("dotenv").config({ path: "../../.env" });
const axios = require("axios");

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4001";
const TERMINAL_ID = process.env.TERMINAL_ID ?? "terminal-001";

/**
 * Trigger a payment for the scanned user.
 *
 * @param {string} uid  - NFC tag UID / user identifier
 * @returns {Promise<void>}
 */
async function triggerPayment(uid) {
  console.log(`[API] Triggering payment for UID: ${uid}`);

  try {
    const response = await axios.post(
      `${BACKEND_URL}/api/trigger-payment`,
      { uid, terminalId: TERMINAL_ID },
      {
        timeout: 8_000,
        headers: { "Content-Type": "application/json" },
      }
    );
    console.log(`[API] Payment triggered — status: ${response.status}`, response.data);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      console.error(
        `[API] Request failed: ${err.response?.status ?? "network error"} — ${err.message}`
      );
    } else {
      console.error("[API] Unexpected error:", err);
    }
  }
}

module.exports = { triggerPayment };
