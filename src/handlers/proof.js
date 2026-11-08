/**
 * Proof Handler - Handles payment proof upload
 */

const config = require('../config');
const transactionService = require('../services/transactionService');
const filmService = require('../services/filmService');
const telegramService = require('../services/telegramService');
const db = require('../database');

/**
 * Handle photo message (payment proof)
 */
async function handleProofUpload(ctx) {
  const userId = ctx.from.id;
  
  // Check if message contains photo
  if (!ctx.message || !ctx.message.photo) {
    return ctx.reply('⚠️ Mohon kirim bukti pembayaran berupa foto/screenshot.');
  }
  
  // Get the highest quality photo
  const photos = ctx.message.photo;
  const proofFileId = photos[photos.length - 1].file_id;
  
  // Get user's pending transaction
  const transaction = await transactionService.getUserPendingTransaction(userId);
  
  if (!transaction) {
    return ctx.reply(
      '⚠️ Tidak ada transaksi yang sedang menunggu pembayaran.\n\n' +
      'Silakan mulai pembelian film terlebih dahulu.'
    );
  }
  
  // Check transaction status
  if (transaction.status !== config.transactionStatus.WAITING_PAYMENT) {
    const statusMessage = transaction.status === config.transactionStatus.WAITING_VERIFICATION
      ? 'Transaksi Anda sudah menunggu verifikasi.'
      : 'Tidak ada transaksi yang perlu dibayar.';
    
    return ctx.reply(`⚠️ ${statusMessage}`);
  }
  
  // Submit payment proof
  const result = await transactionService.submitPaymentProof(transaction.id, proofFileId);
  
  if (!result.success) {
    return ctx.reply('⚠️ Gagal mengirim bukti pembayaran. Silakan coba lagi.');
  }
  
  // Confirm to user
  await ctx.reply(
    '✅ Bukti pembayaran berhasil dikirim!\n\n' +
    'Pembayaran kamu sedang menunggu verifikasi admin. Mohon tunggu hingga proses verifikasi selesai.'
  );
  
  // Get film details
  const filmResult = await filmService.getFilmById(transaction.film_id);
  
  if (!filmResult.success) {
    console.error('Film not found for transaction:', transaction.id);
    return;
  }
  
  const film = filmResult.film;
  
  // Get user info
  const user = await db.users.getByTelegramId(userId);
  
  // Send notification to all admins
  const admins = await db.admins.getAll();
  
  for (const admin of admins) {
    try {
      // Create temporary context for sending admin notification
      const adminMessage = await telegramService.sendAdminVerificationRequest(
        { replyWithPhoto: async (fileId, opts) => {
          return await ctx.telegram.sendPhoto(admin.telegram_id, fileId, opts);
        }},
        transaction,
        film,
        user || { telegram_id: userId, username: ctx.from.username, first_name: ctx.from.first_name },
        proofFileId
      );
      
      // Save admin message info
      if (adminMessage) {
        await transactionService.setAdminNotificationInfo(
          transaction.id,
          adminMessage.message_id,
          admin.telegram_id
        );
      }
    } catch (error) {
      console.error(`Failed to send notification to admin ${admin.telegram_id}:`, error.message);
    }
  }
}

/**
 * Handle non-photo messages when user has pending transaction
 */
async function handleNonPhotoPayment(ctx) {
  const userId = ctx.from.id;
  const transaction = await transactionService.getUserPendingTransaction(userId);
  
  if (transaction && transaction.status === config.transactionStatus.WAITING_PAYMENT) {
    return ctx.reply(
      '📷 Mohon kirim bukti pembayaran berupa foto atau screenshot.\n\n' +
      'Tekan tombol attachment dan pilih foto untuk mengirim bukti transfer.'
    );
  }
}

module.exports = {
  handleProofUpload,
  handleNonPhotoPayment
};
