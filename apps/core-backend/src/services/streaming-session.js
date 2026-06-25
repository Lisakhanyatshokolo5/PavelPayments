/**
 * streaming-session.js
 *
 * Manages streaming play/pause session tracking.
 *
 * startStream → opens a StreamSession (endedAt = null)
 * endStream   → closes the session, computes minutesWatched
 *
 * Sessions accumulate throughout the day and are settled at midnight
 * by the same settlement.js cron that handles gym.
 */

"use strict";

const { Op } = require("sequelize");
const { User, StreamSession } = require("../models");

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Start a streaming session (user pressed play).
 * Auto-closes any prior open session for the same user.
 *
 * @param {{ nfcUid: string, contentId: string, contentTitle?: string, contentType?: string }} params
 * @returns {Promise<StreamSession>}
 */
async function startStream({ nfcUid, contentId, contentTitle = "", contentType = "movie" }) {
  const user = await User.findOne({ where: { nfcUid } });
  if (!user) throw new Error(`Unknown NFC UID: ${nfcUid}`);

  // Close any forgotten open session
  const open = await StreamSession.findOne({ where: { userId: user.id, endedAt: null } });
  if (open) {
    const now = new Date();
    const minutes = Math.round((now - new Date(open.startedAt)) / 60000);
    await open.update({ endedAt: now, minutesWatched: minutes });
  }

  const session = await StreamSession.create({
    userId: user.id,
    contentId,
    contentTitle,
    contentType,
    startedAt: new Date(),
    date: todayDate(),
  });

  return session;
}

/**
 * End a streaming session (user paused or stopped).
 *
 * @param {{ sessionId: string }} params
 * @returns {Promise<StreamSession>}
 */
async function endStream({ sessionId }) {
  const session = await StreamSession.findByPk(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);
  if (session.endedAt) throw new Error(`Session already ended: ${sessionId}`);

  const now = new Date();
  const minutes = Math.round((now - new Date(session.startedAt)) / 60000);
  await session.update({ endedAt: now, minutesWatched: minutes });

  return session;
}

/**
 * Get current open stream session and today's total minutes for a user.
 *
 * @param {{ nfcUid: string }} params
 */
async function getStreamStatus({ nfcUid }) {
  const user = await User.findOne({ where: { nfcUid } });
  if (!user) throw new Error(`Unknown NFC UID: ${nfcUid}`);

  const currentSession = await StreamSession.findOne({
    where: { userId: user.id, endedAt: null },
  });

  const today = todayDate();
  const closedSessions = await StreamSession.findAll({
    where: { userId: user.id, date: today, endedAt: { [Op.ne]: null } },
  });

  const todayMinutes = closedSessions.reduce((sum, s) => sum + (s.minutesWatched ?? 0), 0);

  return { currentSession, todayMinutes, user };
}

/**
 * Auto-close all open stream sessions for a user (called by settlement cron).
 * @param {string} userId
 */
async function closeOpenStreamSessions(userId) {
  const open = await StreamSession.findAll({ where: { userId, endedAt: null } });
  for (const s of open) {
    const now = new Date();
    const minutes = Math.round((now - new Date(s.startedAt)) / 60000);
    await s.update({ endedAt: now, minutesWatched: minutes });
  }
}

module.exports = { startStream, endStream, getStreamStatus, closeOpenStreamSessions };
