/**
 * Admin Handler - Admin commands for film and transaction management
 */

const config = require('../config');
const transactionService = require('../services/transactionService');
const filmService = require('../services/filmService');
const telegramService = require('../services/telegramService');
const formatCurrency = require('../utils/formatCurrency');

// Store pagination state per admin
const paginationStates = new Map();

/**
 * Handle /addfilm command
 * Format: /addfilm <ID> <Harga> <Judul>
 * Must reply to a photo
 */
async function handleAddFilm(ctx) {
  const text = ctx.message?.text || '';
  const replyTo = ctx.message?.reply_to_message;
  
  // Check if replying to a photo
  if (!replyTo || !replyTo.photo) {
    return ctx.reply(
      '⚠️ Command ini harus dikirim dengan me-reply foto.\n\n' +
      'Cara penggunaan:\n' +
      '1. Kirim foto poster film\n' +
      '2. Reply foto tersebut dengan: /addfilm <ID> <Harga> <Judul>\n\n' +
      'Contoh: /addfilm FILM001 25000 Interstellar'
    );
  }
  
  // Parse command
  const args = text.slice('/addfilm'.length).trim().split(/\s+/);
  
  if (args.length < 3) {
    return ctx.reply(
      '⚠️ Format salah.\n\n' +
      'Format: /addfilm <ID> <Harga> <Judul>\n' +
      'Contoh: /addfilm FILM001 25000 Interstellar'
    );
  }
  
  const id = args[0].toUpperCase();
  const price = parseInt(args[1]);
  const title = args.slice(2).join(' ');
  
  // Validate price
  if (isNaN(price) || price <= 0) {
    return ctx.reply('⚠️ Harga harus berupa angka positif.');
  }
  
  // Get highest quality photo
  const photos = replyTo.photo;
  const posterFileId = photos[photos.length - 1].file_id;
  
  // Create film
  const result = await filmService.createFilm(id, title, price, posterFileId);
  
  if (!result.success) {
    return ctx.reply(`⚠️ ${result.error}`);
  }
  
  const film = result.film;
  
  return ctx.reply(
    `✅ Film berhasil ditambahkan!\n\n` +
    `ID: ${film.id}\n` +
    `Judul: ${film.title}\n` +
    `Harga: ${formatCurrency(film.price)}\n\n` +
    `Poster berhasil disimpan.\n\n` +
    `Tambahkan video menggunakan /addmedia ${film.id} dengan me-reply video.`
  );
}

/**
 * Handle /addmedia command
 * Format: /addmedia <ID>
 * Must reply to a video
 */
async function handleAddMedia(ctx) {
  const text = ctx.message?.text || '';
  const replyTo = ctx.message?.reply_to_message;
  
  // Check if replying to a video
  if (!replyTo || !replyTo.video) {
    return ctx.reply(
      '⚠️ Command ini harus dikirim dengan me-reply video.\n\n' +
      'Cara penggunaan:\n' +
      '1. Kirim video film\n' +
      '2. Reply video tersebut dengan: /addmedia <ID>\n\n' +
      'Contoh: /addmedia FILM001'
    );
  }
  
  // Parse command
  const args = text.slice('/addmedia'.length).trim().split(/\s+/);
  
  if (args.length < 1) {
    return ctx.reply(
      '⚠️ Format salah.\n\n' +
      'Format: /addmedia <ID>\n' +
      'Contoh: /addmedia FILM001'
    );
  }
  
  const filmId = args[0].toUpperCase();
  const videoFileId = replyTo.video.file_id;
  
  // Add media to film
  const result = await filmService.addMedia(filmId, videoFileId);
  
  if (!result.success) {
    return ctx.reply(`⚠️ ${result.error}`);
  }
  
  const film = result.film;
  
  return ctx.reply(
    `✅ Media film berhasil ditambahkan!\n\n` +
    `ID: ${film.id}\n` +
    `Judul: ${film.title}\n\n` +
    `Film sekarang tersedia untuk dibeli.`
  );
}

/**
 * Handle /film command - List films with pagination
 */
async function handleFilmList(ctx) {
  const films = await filmService.getAllFilms();
  
  if (films.length === 0) {
    return ctx.reply('Belum ada film yang terdaftar.');
  }
  
  const adminId = ctx.from.id;
  
  // Initialize pagination state
  paginationStates.set(adminId, {
    currentPage: 0,
    totalItems: films.length,
    messageId: null
  });
  
  const state = paginationStates.get(adminId);
  
  // Show first film
  await showFilmPage(ctx, state);
}

/**
 * Show film page for pagination
 */
async function showFilmPage(ctx, state) {
  const film = await filmService.getFilmForPagination(state.currentPage);
  
  if (!film) {
    return ctx.reply('Film tidak ditemukan.');
  }
  
  const caption = telegramService.formatFilmForAdmin(film, state.currentPage, state.totalItems);
  
  const keyboard = {
    inline_keyboard: [
      [
        { text: '◀️', callback_data: 'film_prev' },
        { text: `${state.currentPage + 1}/${state.totalItems}`, callback_data: 'film_page' },
        { text: '▶️', callback_data: 'film_next' }
      ]
    ]
  };
  
  if (film.poster_file_id) {
    if (state.messageId) {
      // Edit existing message
      try {
        await ctx.editMessageMedia(
          {
            type: 'photo',
            media: film.poster_file_id,
            caption,
            parse_mode: 'Markdown'
          },
          { reply_markup: keyboard }
        );
      } catch (error) {
        // Message might not exist, send new one
        state.messageId = null;
      }
    }
    
    if (!state.messageId) {
      const message = await ctx.replyWithPhoto(film.poster_file_id, {
        caption,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      state.messageId = message.message_id;
      paginationStates.set(ctx.from.id, state);
    }
  } else {
    if (state.messageId) {
      await ctx.editMessageText(caption, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } else {
      const message = await ctx.reply(caption, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      state.messageId = message.message_id;
      paginationStates.set(ctx.from.id, state);
    }
  }
}

/**
 * Handle film pagination callbacks
 */
async function handleFilmPagination(ctx, action) {
  const adminId = ctx.from.id;
  const state = paginationStates.get(adminId);
  
  if (!state) {
    return ctx.answerCbQuery('Session expired. Please use /film again.');
  }
  
  if (action === 'prev' && state.currentPage > 0) {
    state.currentPage--;
    await showFilmPage(ctx, state);
  } else if (action === 'next' && state.currentPage < state.totalItems - 1) {
    state.currentPage++;
    await showFilmPage(ctx, state);
  }
  
  return ctx.answerCbQuery();
}

/**
 * Handle /terima command
 * Must reply to admin notification message
 */
async function handleApproveCommand(ctx) {
  const replyTo = ctx.message?.reply_to_message;
  
  if (!replyTo) {
    return ctx.reply('⚠️ Command ini harus me-reply notifikasi transaksi.');
  }
  
  // Extract transaction ID from replied message
  // Transaction ID is in the format: TRX-XXXXXXXX
  const caption = replyTo.caption || '';
  const match = caption.match(/TRX-[A-Z0-9]{8}/);
  
  if (!match) {
    return ctx.reply('⚠️ Tidak dapat menemukan ID transaksi pada pesan yang di-reply.');
  }
  
  const transactionId = match[0];
  
  // Verify transaction exists
  const transaction = await transactionService.getTransactionById(transactionId);
  
  if (!transaction) {
    return ctx.reply('⚠️ Transaksi tidak ditemukan.');
  }
  
  // Approve transaction
  const result = await transactionService.approveTransaction(transactionId, ctx.from.id);
  
  if (!result.success) {
    return ctx.reply(`⚠️ ${result.error}`);
  }
  
  // Get film details
  const filmResult = await filmService.getFilmById(transaction.film_id);
  
  if (!filmResult.success) {
    return ctx.reply('⚠️ Film tidak ditemukan.');
  }
  
  const film = filmResult.film;
  
  // Update admin notification message
  try {
    // Get user info
    const user = await require('../database').users.getByTelegramId(transaction.user_id);
    const newCaption = `**PEMBAYARAN DITERIMA ✅**

Detail Transaksi:
- ID Transaksi: ${transaction.id}
- ID Film: ${film.id}
- Judul Film: ${film.title}
- Harga: ${formatCurrency(film.price)}

Detail Pembeli:
- Nama: ${user?.first_name || 'Tidak ada'}
- Username: ${user?.username ? '@' + user.username : 'Tidak ada'}
- Telegram ID: ${transaction.user_id}

Status: ✅ Disetujui oleh admin`;
    
    await ctx.telegram.editMessageCaption(
      transaction.admin_chat_id,
      transaction.admin_message_id,
      null,
      newCaption,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Failed to update admin notification:', error.message);
  }
  
  // Notify user
  try {
    await ctx.telegram.sendMessage(
      transaction.user_id,
      `✅ PEMBAYARAN BERHASIL!\n\n` +
      `Pembayaran kamu telah diverifikasi dan disetujui oleh admin.\n\n` +
      `Film: ${film.title}\n` +
      `ID Transaksi: ${transaction.id}\n\n` +
      `Selamat menonton!`
    );
    
    // Send video
    if (film.video_file_id) {
      await ctx.telegram.sendVideo(transaction.user_id, film.video_file_id, {
        caption: `🎬 ${film.title}\n\nSelamat menonton!`
      });
      
      await transactionService.updateDeliveryStatus(transactionId, config.deliveryStatus.SENT);
    }
  } catch (error) {
    console.error('Failed to send video to user:', error.message);
    await transactionService.updateDeliveryStatus(transactionId, config.deliveryStatus.FAILED);
  }
  
  return ctx.reply(
    `✅ Transaksi ${transactionId} telah disetujui.\n` +
    `Video telah dikirim ke pengguna.`
  );
}

/**
 * Handle /tolak command
 * Format: /tolak <Alasan>
 * Must reply to admin notification message
 */
async function handleRejectCommand(ctx) {
  const text = ctx.message?.text || '';
  const replyTo = ctx.message?.reply_to_message;
  
  if (!replyTo) {
    return ctx.reply('⚠️ Command ini harus me-reply notifikasi transaksi.');
  }
  
  // Extract transaction ID from replied message
  const caption = replyTo.caption || '';
  const match = caption.match(/TRX-[A-Z0-9]{8}/);
  
  if (!match) {
    return ctx.reply('⚠️ Tidak dapat menemukan ID transaksi pada pesan yang di-reply.');
  }
  
  const transactionId = match[0];
  
  // Extract rejection reason
  const reason = text.slice('/tolak'.length).trim();
  
  if (!reason) {
    return ctx.reply('⚠️ Format: /tolak <Alasan>\n\nContoh: /tolak Bukti pembayaran tidak valid.');
  }
  
  // Verify transaction exists
  const transaction = await transactionService.getTransactionById(transactionId);
  
  if (!transaction) {
    return ctx.reply('⚠️ Transaksi tidak ditemukan.');
  }
  
  // Reject transaction
  const result = await transactionService.rejectTransaction(transactionId, ctx.from.id, reason);
  
  if (!result.success) {
    return ctx.reply(`⚠️ ${result.error}`);
  }
  
  // Get film details
  const filmResult = await filmService.getFilmById(transaction.film_id);
  
  if (!filmResult.success) {
    return ctx.reply('⚠️ Film tidak ditemukan.');
  }
  
  const film = filmResult.film;
  
  // Update admin notification message
  try {
    const user = await require('../database').users.getByTelegramId(transaction.user_id);
    const newCaption = `**PEMBAYARAN DITOLAK ❌**

Detail Transaksi:
- ID Transaksi: ${transaction.id}
- ID Film: ${film.id}
- Judul Film: ${film.title}
- Harga: ${formatCurrency(film.price)}

Detail Pembeli:
- Nama: ${user?.first_name || 'Tidak ada'}
- Username: ${user?.username ? '@' + user.username : 'Tidak ada'}
- Telegram ID: ${transaction.user_id}

Status: ❌ Ditolak oleh admin
Alasan: ${reason}`;
    
    await ctx.telegram.editMessageCaption(
      transaction.admin_chat_id,
      transaction.admin_message_id,
      null,
      newCaption,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    console.error('Failed to update admin notification:', error.message);
  }
  
  // Notify user
  await ctx.telegram.sendMessage(
    transaction.user_id,
    `❌ PEMBAYARAN DITOLAK\n\n` +
    `Mohon maaf, pembayaran kamu tidak dapat diverifikasi.\n\n` +
    `Alasan: ${reason}\n\n` +
    `Silakan periksa kembali pembayaran kamu dan lakukan pemesanan ulang jika diperlukan.`
  );
  
  return ctx.reply(
    `✅ Transaksi ${transactionId} telah ditolak.\n` +
    `Pengguna telah diberitahu.`
  );
}

/**
 * Handle approval button click
 */
async function handleApproveButton(ctx, transactionId) {
  const userId = ctx.from.id;
  
  // Verify transaction exists
  const transaction = await transactionService.getTransactionById(transactionId);
  
  if (!transaction) {
    return ctx.answerCbQuery('Transaksi tidak ditemukan.', { show_alert: true });
  }
  
  // Approve transaction
  const result = await transactionService.approveTransaction(transactionId, userId);
  
  if (!result.success) {
    return ctx.answerCbQuery(result.error, { show_alert: true });
  }
  
  // Get film details
  const filmResult = await filmService.getFilmById(transaction.film_id);
  
  if (!filmResult.success) {
    return ctx.answerCbQuery('Film tidak ditemukan.', { show_alert: true });
  }
  
  const film = filmResult.film;
  
  // Update admin notification message
  try {
    const user = await require('../database').users.getByTelegramId(transaction.user_id);
    const newCaption = `**PEMBAYARAN DITERIMA ✅**

Detail Transaksi:
- ID Transaksi: ${transaction.id}
- ID Film: ${film.id}
- Judul Film: ${film.title}
- Harga: ${formatCurrency(film.price)}

Detail Pembeli:
- Nama: ${user?.first_name || 'Tidak ada'}
- Username: ${user?.username ? '@' + user.username : 'Tidak ada'}
- Telegram ID: ${transaction.user_id}

Status: ✅ Disetujui oleh admin`;
    
    await ctx.editMessageCaption(newCaption, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Failed to update admin notification:', error.message);
  }
  
  // Notify user
  try {
    await ctx.telegram.sendMessage(
      transaction.user_id,
      `✅ PEMBAYARAN BERHASIL!\n\n` +
      `Pembayaran kamu telah diverifikasi dan disetujui oleh admin.\n\n` +
      `Film: ${film.title}\n` +
      `ID Transaksi: ${transaction.id}\n\n` +
      `Selamat menonton!`
    );
    
    // Send video
    if (film.video_file_id) {
      await ctx.telegram.sendVideo(transaction.user_id, film.video_file_id, {
        caption: `🎬 ${film.title}\n\nSelamat menonton!`
      });
      
      await transactionService.updateDeliveryStatus(transactionId, config.deliveryStatus.SENT);
    }
  } catch (error) {
    console.error('Failed to send video to user:', error.message);
    await transactionService.updateDeliveryStatus(transactionId, config.deliveryStatus.FAILED);
  }
  
  return ctx.answerCbQuery('Transaksi disetujui. Video telah dikirim.', { show_alert: true });
}

/**
 * Handle reject button click - prompt for reason
 */
async function handleRejectButton(ctx, transactionId) {
  // Store pending rejection
  ctx.session = ctx.session || {};
  ctx.session.pendingRejection = transactionId;
  
  await ctx.answerCbQuery('Silakan kirimkan alasan penolakan dengan format: /tolak <Alasan>');
}

module.exports = {
  handleAddFilm,
  handleAddMedia,
  handleFilmList,
  handleFilmPagination,
  handleApproveCommand,
  handleRejectCommand,
  handleApproveButton,
  handleRejectButton
};
