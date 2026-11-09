/**
 * Payment Handler - Handles payment initialization and cancellation
 */

const config = require('../config');
const db = require('../database');
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

/**
 * Handle cancel payment button
 */
async function handleCancelPayment(ctx, transactionId) {
  try {
    const userId = ctx.from.id;
    
    console.log('Cancel payment clicked for transaction:', transactionId, 'by user:', userId);
    
    // Get transaction
    const transaction = await db.transactions.getById(transactionId);
    
    if (!transaction) {
      return ctx.answerCbQuery('Transaksi tidak ditemukan.', { show_alert: true });
    }
    
    // Verify ownership
    if (transaction.user_id !== userId) {
      return ctx.answerCbQuery('Transaksi ini bukan milik Anda.', { show_alert: true });
    }
    
    // Check if transaction can be cancelled
    if (transaction.status !== 'WAITING_PAYMENT') {
      return ctx.answerCbQuery('Transaksi ini tidak dapat dibatalkan.', { show_alert: true });
    }
    
    // Update transaction status to CANCELLED
    await db.transactions.update(transactionId, { status: 'CANCELLED' });
    
    console.log('Transaction cancelled:', transactionId);
    
    // Delete the payment instruction message
    try {
      await ctx.deleteMessage();
    } catch (error) {
      console.log('Could not delete message:', error.message);
    }
    
    // Notify user
    await ctx.reply('✅ Pembayaran berhasil dibatalkan. Anda dapat melakukan pembelian kembali kapan saja.');
    
    await ctx.answerCbQuery('Pembayaran dibatalkan.');
  } catch (error) {
    console.error('Error in handleCancelPayment:', error);
    return ctx.answerCbQuery('Terjadi kesalahan. Silakan coba lagi.', { show_alert: true });
  }
}

module.exports = {
  handlePaymentButton,
  handleCancelPayment
};
