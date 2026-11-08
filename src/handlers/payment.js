/**
 * Payment Handler - Handles payment initialization
 */

const config = require('../config');
const transactionService = require('../services/transactionService');
const filmService = require('../services/filmService');
const telegramService = require('../services/telegramService');

/**
 * Handle payment button click
 */
async function handlePaymentButton(ctx, filmId) {
  const userId = ctx.from.id;
  
  // Check if QRIS is configured
  if (!config.qrisImageFileId) {
    return ctx.answerCbQuery('QRIS belum dikonfigurasi. Pembayaran tidak tersedia.', { show_alert: true });
  }
  
  // Get film details
  const result = await filmService.getFilmById(filmId);
  
  if (!result.success) {
    return ctx.answerCbQuery('Film tidak ditemukan.', { show_alert: true });
  }
  
  const film = result.film;
  
  // Check if film has video
  const isAvailable = await filmService.isFilmAvailable(filmId);
  
  if (!isAvailable) {
    return ctx.answerCbQuery('Film belum tersedia untuk dibeli.', { show_alert: true });
  }
  
  // Create transaction
  const txResult = await transactionService.createTransaction(userId, filmId, film.price);
  
  if (!txResult.success) {
    // If user has pending transaction, show it
    if (txResult.transaction) {
      return ctx.answerCbQuery(
        'Anda memiliki transaksi yang masih pending. Silakan selesaikan transaksi sebelumnya.',
        { show_alert: true }
      );
    }
    return ctx.answerCbQuery(txResult.error, { show_alert: true });
  }
  
  const transaction = txResult.transaction;
  
  // Delete the previous message (film details)
  try {
    await ctx.deleteMessage();
  } catch (error) {
    // Message might already be deleted, ignore error
  }
  
  // Send payment instructions
  await telegramService.sendPaymentInstructions(ctx, transaction, film);
}

module.exports = {
  handlePaymentButton
};
