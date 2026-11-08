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
  try {
    const userId = ctx.from.id;
    
    console.log('Payment button clicked for film:', filmId, 'by user:', userId);
    
    // Check if QRIS is configured
    if (!config.qrisImageFileId) {
      console.log('QRIS not configured');
      return ctx.answerCbQuery('QRIS belum dikonfigurasi. Pembayaran tidak tersedia.', { show_alert: true });
    }
    
    // Get film details
    const result = await filmService.getFilmById(filmId);
    
    if (!result.success) {
      console.log('Film not found:', filmId);
      return ctx.answerCbQuery('Film tidak ditemukan.', { show_alert: true });
    }
    
    const film = result.film;
    
    // Check if film has video
    const isAvailable = await filmService.isFilmAvailable(filmId);
    
    if (!isAvailable) {
      console.log('Film not available:', filmId);
      return ctx.answerCbQuery('Film belum tersedia untuk dibeli.', { show_alert: true });
    }
    
    // Create transaction
    console.log('Creating transaction...');
    const txResult = await transactionService.createTransaction(userId, filmId, film.price);
    
    if (!txResult.success) {
      console.log('Transaction creation failed:', txResult.error);
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
    console.log('Transaction created:', transaction.id);
    
    // Delete the previous message (film details)
    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('Could not delete message:', error.message);
      // Message might already be deleted, ignore error
    }
    
    // Send payment instructions
    console.log('Sending payment instructions...');
    await telegramService.sendPaymentInstructions(ctx, transaction, film);
    
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in handlePaymentButton:', error);
    return ctx.answerCbQuery('Terjadi kesalahan. Silakan coba lagi.', { show_alert: true });
  }
}

module.exports = {
  handlePaymentButton
};
