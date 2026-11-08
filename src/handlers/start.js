/**
 * Start Handler - Handles deep link and initial bot start
 */

const filmService = require('../services/filmService');
const telegramService = require('../services/telegramService');

/**
 * Handle /start command with optional film ID
 */
async function handleStart(ctx) {
  const startParam = ctx.startPayload;
  
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
