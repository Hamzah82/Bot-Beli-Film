/**
 * Film Service - Business logic for film management
 */

const db = require('../database');

/**
 * Get film by ID with availability check
 */
async function getFilmById(id) {
  const film = await db.films.getById(id);
  
  if (!film) {
    return { success: false, error: 'Film tidak ditemukan' };
  }
  
  return { success: true, film };
}

/**
 * Check if film is available for purchase
 * Film is available if it has video_file_id
 */
async function isFilmAvailable(id) {
  const film = await db.films.getById(id);
  
  if (!film) {
    return false;
  }
  
  return film.video_file_id !== null;
}

/**
 * Create new film
 */
async function createFilm(id, title, price, posterFileId) {
  // Check if ID already exists
  const exists = await db.films.exists(id);
  if (exists) {
    return { success: false, error: 'ID film sudah digunakan' };
  }
  
  // Validate price
  if (typeof price !== 'number' || price <= 0) {
    return { success: false, error: 'Harga harus berupa angka positif' };
  }
  
  const now = new Date().toISOString();
  
  const filmData = {
    id,
    title,
    price,
    poster_file_id: posterFileId,
    video_file_id: null,
    created_at: now,
    updated_at: now
  };
  
  await db.films.create(filmData);
  
  return { success: true, film: filmData };
}

/**
 * Add or update video for film
 */
async function addMedia(filmId, videoFileId) {
  const film = await db.films.getById(filmId);
  
  if (!film) {
    return { success: false, error: 'Film tidak ditemukan' };
  }
  
  await db.films.update(filmId, { video_file_id: videoFileId });
  
  return { success: true, film: { ...film, video_file_id: videoFileId } };
}

/**
 * Get all films
 */
async function getAllFilms() {
  return await db.films.getAll();
}

/**
 * Get films count
 */
async function getFilmsCount() {
  const films = await db.films.getAll();
  return films.length;
}

/**
 * Get film for pagination
 */
async function getFilmForPagination(index) {
  const films = await db.films.getAll();
  
  if (index < 0 || index >= films.length) {
    return null;
  }
  
  return films[index];
}

module.exports = {
  getFilmById,
  isFilmAvailable,
  createFilm,
  addMedia,
  getAllFilms,
  getFilmsCount,
  getFilmForPagination
};
