/**
 * gym-session.js
 *
 * Handles tap-in / tap-out session tracking for gym members.
 *
 * A user may tap in and out multiple times per day (lunch break, etc.).
 * All sessions are summed by the midnight settlement job.
 *
 * tapIn  → opens a GymSession (tapOutAt = null)
 * tapOut → closes the open session, computes minutesAccumulated
 *
 * getDailyMinutes → returns { totalMinutes, peakMinutes } for a user+date,
 *                   used by the settlement cron to calculate the charge.
 */

"use strict";

const { Op } = require("sequelize");
const { User, GymSession } = require("../models");

/**
 * Returns today's date as a DATEONLY string (YYYY-MM-DD) in local time.
 */
function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Record a gym entry (tap-in).
 * If the user already has an open session (forgot to tap out), it is
 * auto-closed before opening the new one.
 *
 * @param {{ nfcUid: string, terminalId: string }} params
 * @returns {Promise<GymSession>}
 */
async function tapIn({ nfcUid, terminalId }) {
  const user = await User.findOne({ where: { nfcUid } });
  if (!user) throw new Error(`Unknown NFC UID: ${nfcUid}`);

  // Auto-close any forgotten open session
  const openSession = await GymSession.findOne({
    where: { userId: user.id, tapOutAt: null },
  });
  if (openSession) {
    const now = new Date();
    const minutes = Math.round((now - new Date(openSession.tapInAt)) / 60000);
    await openSession.update({ tapOutAt: now, minutesAccumulated: minutes });
  }

  const session = await GymSession.create({
    userId: user.id,
    terminalId,
    tapInAt: new Date(),
    date: todayDate(),
  });

  return session;
}

/**
 * Record a gym exit (tap-out).
 * Finds the open session, computes duration, and closes it.
 *
 * @param {{ nfcUid: string, terminalId: string }} params
 * @returns {Promise<GymSession>}
 */
async function tapOut({ nfcUid, terminalId }) {
  const user = await User.findOne({ where: { nfcUid } });
  if (!user) throw new Error(`Unknown NFC UID: ${nfcUid}`);

  const openSession = await GymSession.findOne({
    where: { userId: user.id, tapOutAt: null },
  });
  if (!openSession) throw new Error(`No open session found for UID: ${nfcUid}`);

  const now = new Date();
  const minutes = Math.round((now - new Date(openSession.tapInAt)) / 60000);
  await openSession.update({ tapOutAt: now, minutesAccumulated: minutes, terminalId });

  return openSession;
}

/**
 * Get the current open session for a user (if any) plus today's accumulated minutes.
 *
 * @param {{ nfcUid: string }} params
 * @returns {Promise<{ currentSession: GymSession|null, todayMinutes: number, peakMinutes: number, user: User }>}
 */
async function getSessionStatus({ nfcUid }) {
  const user = await User.findOne({ where: { nfcUid } });
  if (!user) throw new Error(`Unknown NFC UID: ${nfcUid}`);

  const today = todayDate();

  const currentSession = await GymSession.findOne({
    where: { userId: user.id, tapOutAt: null },
  });

  const { totalMinutes, peakMinutes } = await getDailyMinutes({ userId: user.id, date: today });

  return { currentSession, todayMinutes: totalMinutes, peakMinutes, user };
}

/**
 * Sum all closed sessions for a user on a given date.
 * Also returns the count of peak minutes (used by billing engine).
 *
 * Peak hours: 06:00–09:00 and 17:00–20:00 local time.
 *
 * @param {{ userId: string, date: string }} params  — date is YYYY-MM-DD
 * @returns {Promise<{ totalMinutes: number, peakMinutes: number, sessions: GymSession[] }>}
 */
async function getDailyMinutes({ userId, date }) {
  const PEAK_RANGES = [
    { start: 6, end: 9 },
    { start: 17, end: 20 },
  ];

  const sessions = await GymSession.findAll({
    where: {
      userId,
      date,
      tapOutAt: { [Op.ne]: null }, // closed sessions only
    },
  });

  let totalMinutes = 0;
  let peakMinutes = 0;

  for (const s of sessions) {
    const mins = s.minutesAccumulated ?? 0;
    totalMinutes += mins;
    const hour = new Date(s.tapInAt).getHours();
    if (PEAK_RANGES.some((r) => hour >= r.start && hour < r.end)) {
      peakMinutes += mins;
    }
  }

  return { totalMinutes, peakMinutes, sessions };
}

/**
 * Auto-close all open sessions for a user (called by settlement cron before calculating).
 *
 * @param {string} userId
 */
async function closeOpenSessions(userId) {
  const open = await GymSession.findAll({ where: { userId, tapOutAt: null } });
  for (const s of open) {
    const now = new Date();
    const minutes = Math.round((now - new Date(s.tapInAt)) / 60000);
    await s.update({ tapOutAt: now, minutesAccumulated: minutes });
  }
}

module.exports = { tapIn, tapOut, getSessionStatus, getDailyMinutes, closeOpenSessions };
