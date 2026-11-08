/**
 * Telegram Service - Helper functions for Telegram API operations
 */

const config = require('../config');

/**
 * Send film details with poster
 */
async function sendFilmDetails(ctx, film, includeBuyButton = true) {
  const formatCurrency = require('../utils/formatCurrency');
  
  const caption = `*DETAIL FILM*

Judul: ${film.title}

Harga: ${formatCurrency(film.price)}`;
  
  const keyboard = includeBuyButton ? {
    inline_keyboard: [
      [{ text: '💳 Bayar Sekarang', callback_data: `pay_${film.id}` }]
    ]
  } : undefined;
  
  if (film.poster_file_id) {
    await ctx.replyWithPhoto(film.poster_file_id, {
      caption,
      parse_mode: 'Markdown',
      reply_markup: keyboard
    });
  } else {
    await ctx.reply(caption, { parse_mode: 'Markdown' });
  }
}

/**
 * Send payment instructions with QRIS
 */
async function sendPaymentInstructions(ctx, transaction, film) {
  const formatCurrency = require('../utils/formatCurrency');
  
  const caption = `*PEMBAYARAN FILM*

Detail Pembelian:
- Film: ${film.title}
- ID Film: ${film.id}
- Total: ${formatCurrency(film.price)}
- ID Transaksi: ${transaction.id}

Instruksi:
1. Scan QRIS di atas.
2. Lakukan pembayaran sesuai nominal.
3. Setelah pembayaran berhasil, kirimkan foto atau screenshot bukti transfer ke bot.
4. Tunggu verifikasi dari admin.

Status: Menunggu pembayaran.`;
  
  try {
    if (config.qrisImageFileId) {
      console.log('Sending QRIS image with file_id:', config.qrisImageFileId);
      await ctx.replyWithPhoto(config.qrisImageFileId, {
        caption,
        parse_mode: 'Markdown'
      });
      console.log('Payment instructions sent successfully');
    } else {
      await ctx.reply(caption + '\n\n⚠️ QRIS belum dikonfigurasi. Pembayaran tidak dapat dilanjutkan.', {
        parse_mode: 'Markdown'
      });
    }
  } catch (error) {
    console.error('Error sending payment instructions:', error);
    throw error;
  }
}

/**
 * Send admin verification notification
 */
async function sendAdminVerificationRequest(ctx, transaction, film, user, proofFileId) {
  const formatCurrency = require('../utils/formatCurrency');
  
  const caption = `*PEMBAYARAN MENUNGGU VERIFIKASI*

Detail Transaksi:
- ID Transaksi: ${transaction.id}
- ID Film: ${film.id}
- Judul Film: ${film.title}
- Harga: ${formatCurrency(film.price)}

Detail Pembeli:
- Nama: ${user.first_name || 'Tidak ada nama'}
- Username: ${user.username ? '@' + user.username : 'Tidak ada'}
- Telegram ID: ${user.telegram_id}

Bukti pembayaran terlampir.`;
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '✅ Terima', callback_data: `approve_${transaction.id}` },
        { text: '❌ Tolak', callback_data: `reject_${transaction.id}` }
      ]
    ]
  };
  
  const message = await ctx.replyWithPhoto(proofFileId, {
    caption,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
  
  return message;
}

/**
 * Send video to user
 */
async function sendFilmVideo(ctx, videoFileId, filmTitle) {
  try {
    await ctx.replyWithVideo(videoFileId, {
      caption: `🎬 ${filmTitle}\n\nSelamat menonton!`
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending video:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Generate share link for film
 */
function generateShareLink(filmId) {
  return `https://t.me/${config.botUsername}?start=${filmId}`;
}

/**
 * Format film for admin display
 */
function formatFilmForAdmin(film, index, total) {
  const formatCurrency = require('../utils/formatCurrency');
  const hasVideo = film.video_file_id !== null;
  
  return `*FILM MANAGEMENT*

Judul: ${film.title}

ID: ${film.id}

Harga: ${formatCurrency(film.price)}

Media: ${hasVideo ? '✅ Tersedia' : '❌ Belum tersedia'}

Link Share:
\`${generateShareLink(film.id)}\`
  
Halaman: ${index + 1}/${total}`;
}

module.exports = {
  sendFilmDetails,
  sendPaymentInstructions,
  sendAdminVerificationRequest,
  sendFilmVideo,
  generateShareLink,
  formatFilmForAdmin
};
