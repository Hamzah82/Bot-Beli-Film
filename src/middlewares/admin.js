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
  
  console.log('Admin check for user:', userId);
  
  if (!userId) {
    console.log('Admin check failed: No user ID');
    return ctx.reply('Error: Unable to identify user.');
  }
  
  const isAdmin = await db.admins.isAdmin(userId);
  
  console.log('Is admin:', isAdmin);
  
  if (!isAdmin) {
    console.log('Access denied for user:', userId);
    return ctx.reply('⚠️ Akses ditolak. Fitur ini hanya tersedia untuk admin.');
  }
  
  console.log('Access granted for admin:', userId);
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
