/**
 * transactionController.js
 *
 * GET /api/transactions?walletAddress=...
 * Returns the authenticated user's transaction history.
 */

"use strict";

const { Transaction } = require("../models");

async function listTransactions(req, res) {
  const { walletAddress } = req.query;

  if (!walletAddress) {
    return res.status(400).json({ message: "walletAddress query param is required" });
  }

  try {
    const transactions = await Transaction.findAll({
      where: { walletAddress },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    return res.json(transactions);
  } catch (err) {
    console.error("[transactionController] listTransactions error:", err);
    return res.status(500).json({ message: "Failed to fetch transactions" });
  }
}

module.exports = { listTransactions };
