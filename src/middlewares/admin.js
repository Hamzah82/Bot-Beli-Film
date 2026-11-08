/**
 * Admin authorization middleware
 * Only allows access to registered admins
 */

const db = require('../database');

/**
 * Middleware to check if user is admin
 */
async function adminOnly(ctx, next) {
  const userId = ctx.from?.id;
  
  if (!userId) {
    return ctx.reply('Error: Unable to identify user.');
  }
  
  const isAdmin = await db.admins.isAdmin(userId);
  
  if (!isAdmin) {
    return ctx.reply('⚠️ Akses ditolak. Fitur ini hanya tersedia untuk admin.');
  }
  
  return next();
}

/**
 * Check if user is admin (utility function)
 */
async function isAdmin(userId) {
  return await db.admins.isAdmin(userId);
}

module.exports = {
  adminOnly,
  isAdmin
};
