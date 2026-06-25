/**
 * nfc_scanner.js
 *
 * Simulates / wraps an NFC reader to extract a user identifier from
 * a scanned card or tag. On real hardware, replace the mock with your
 * NFC library (e.g., `nfc-pcsc`, `node-nfc-nci`, or a serial read).
 */

"use strict";

const { EventEmitter } = require("events");

/**
 * NFCScanner — emits a "scan" event each time a card is detected.
 *
 * Events:
 *   "scan"  — { uid: string }  — NFC tag unique identifier
 *   "error" — Error
 */
class NFCScanner extends EventEmitter {
  constructor() {
    super();
    this._polling = false;
  }

  /**
   * Start listening for NFC events.
   * Replace the setInterval mock with real hardware integration.
   */
  start() {
    if (this._polling) return;
    this._polling = true;
    console.log("[NFC] Scanner started — waiting for cards…");

    // ── MOCK: simulate a card tap every 10 seconds ──────────────────
    this._interval = setInterval(() => {
      const mockUid = `MOCK-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
      console.log(`[NFC] Card detected: ${mockUid}`);
      this.emit("scan", { uid: mockUid });
    }, 10_000);
    // ────────────────────────────────────────────────────────────────
  }

  /** Stop polling / listening. */
  stop() {
    clearInterval(this._interval);
    this._polling = false;
    console.log("[NFC] Scanner stopped.");
  }
}

module.exports = new NFCScanner();
