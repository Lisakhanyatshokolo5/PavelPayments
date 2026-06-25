/**
 * index.js — edge-terminal entry point
 *
 * Wires up the NFC scanner to the backend API client.
 */

"use strict";

const scanner = require("./nfc_scanner");
const { triggerPayment } = require("./api_client");

scanner.on("scan", ({ uid }) => {
  triggerPayment(uid).catch(console.error);
});

scanner.on("error", (err) => {
  console.error("[NFC] Scanner error:", err);
});

scanner.start();

// Graceful shutdown
process.on("SIGINT", () => {
  scanner.stop();
  process.exit(0);
});
