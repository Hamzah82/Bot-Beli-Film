/**
 * Start Handler - Handles deep link and initial bot start
 */

const filmService = require('../services/filmService');
const telegramService = require('../services/telegramService');

/**
 * Handle /start command with optional film ID
 */
async function handleStart(ctx) {
  // Get start parameter from message text or startPayload
  const messageText = ctx.message?.text || '';
  const startPayload = ctx.startPayload || '';
  
  // Log for debugging
  console.log('Start handler triggered');
  console.log('Message text:', messageText);
  console.log('Start payload:', startPayload);
  
  // Extract parameter from /start command
  // Format: /start FILM_ID or /start=FILM_ID
  let startParam = startPayload;
  
  if (!startParam && messageText.includes(' ')) {
    // If using space format: /start FILM_ID
    startParam = messageText.split(' ')[1];
  } else if (!startParam && messageText.includes('=')) {
    // If using = format: /start=FILM_ID (from deep link)
    startParam = messageText.split('=')[1];
  }
  
  console.log('Extracted film ID:', startParam);
  
  // If no parameter, show generic message
  if (!startParam) {
    return ctx.reply(
      '👋 Selamat datang!\n\n' +
      'Gunakan link film yang memuat ID film untuk mulai membeli.\n\n' +
      'Contoh: https://t.me/BOT_USERNAME?start=FILM001'
    );
  }
  
  // Extract film ID from start parameter
  const filmId = startParam.trim().toUpperCase();
  
  // Get film details
  const result = await filmService.getFilmById(filmId);
  
  if (!result.success) {
    return ctx.reply(
      '😔 Maaf, film yang kamu cari tidak ditemukan atau sudah tidak tersedia.'
    );
  }
  
  const film = result.film;
  
  // Check if film has video
  const isAvailable = await filmService.isFilmAvailable(filmId);
  
  if (!isAvailable) {
    return ctx.replyWithPhoto(film.poster_file_id, {
      caption: `*DETAIL FILM*

Judul: ${film.title}

Harga: Film belum tersedia untuk dibeli.`,
      parse_mode: 'Markdown'
    });
  }
  
  // Show film details with buy button
  await telegramService.sendFilmDetails(ctx, film, true);
}

module.exports = {
  handleStart
};
