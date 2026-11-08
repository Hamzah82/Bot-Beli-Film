/**
 * User session management middleware
 */

const db = require('../database');

/**
 * Middleware to track user information
 */
async function trackUser(ctx, next) {
  const telegramId = ctx.from?.id;
  
  if (telegramId) {
    // Create or update user in database
    await db.users.createOrUpdate({
      telegram_id: telegramId,
      username: ctx.from.username || null,
      first_name: ctx.from.first_name || null
    });
  }
  
  return next();
}

/**
 * Get user's pending transaction
 */
async function getPendingTransaction(ctx) {
  const userId = ctx.from?.id;
  if (!userId) return null;
  
  return await db.transactions.getPendingByUserId(userId);
}

module.exports = {
  trackUser,
  getPendingTransaction
};
