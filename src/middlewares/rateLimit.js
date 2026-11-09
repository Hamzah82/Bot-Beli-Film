/**
 * Rate Limiting Middleware
 * Prevents spam and abuse by limiting request frequency
 * ADMITS ADMINS - No rate limiting for admin users
 */

const db = require('../database');
const userRequests = new Map();
const RATE_LIMIT_MS = 5000; // 5 seconds between requests

/**
 * Rate limiting middleware - SKIPS FOR ADMINS
 */
async function rateLimit(ctx, next) {
  const userId = ctx.from?.id;
  
  if (!userId) {
    return next();
  }
  
  // Check if user is admin - skip rate limiting for admins
  const isAdmin = await db.admins.isAdmin(userId);
  if (isAdmin) {
    return next();
  }
  
  const now = Date.now();
  const lastRequest = userRequests.get(userId) || 0;
  
  if (now - lastRequest < RATE_LIMIT_MS) {
    const waitTime = Math.ceil((RATE_LIMIT_MS - (now - lastRequest)) / 1000);
    console.log(`Rate limit hit for user ${userId}. Wait ${waitTime}s`);
    
    if (ctx.callbackQuery) {
      return ctx.answerCbQuery(`Tunggu ${waitTime} detik sebelum mencoba lagi.`, { show_alert: true });
    }
    return ctx.reply(`⚠️ Tunggu ${waitTime} detik sebelum mencoba lagi.`);
  }
  
  userRequests.set(userId, now);
  
  // Clean up old entries periodically
  if (userRequests.size > 1000) {
    const threshold = now - 60000; // 1 minute ago
    for (const [id, timestamp] of userRequests.entries()) {
      if (timestamp < threshold) {
        userRequests.delete(id);
      }
    }
  }
  
  return next();
}

module.exports = rateLimit;
