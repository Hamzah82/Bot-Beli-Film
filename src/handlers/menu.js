/**
 * Menu Handler - User guide and help
 */

/**
 * Handle /menu command - Show user help menu
 */
async function handleMenu(ctx) {
  const message = `**📖 PANDUAN PENGGUNA**

Selamat datang di Film Store Bot! 🎬

**🛒 Cara Membeli Film**

1️⃣ **Dapatkan Link Film**
Minta link film dari admin atau temukan di postingan Instagram.

2️⃣ **Buka Link Film**
Klik link atau scan QR code yang diberikan.
Format: https://t.me/BOT_USERNAME?start=FILM_ID

3️⃣ **Lihat Detail Film**
Bot akan menampilkan:
• Poster film
• Judul film
• Harga film

4️⃣ **Bayar Sekarang**
Tekan tombol "💳 Bayar Sekarang"

5️⃣ **Lakukan Pembayaran**
• Scan QRIS yang muncul
• Transfer sesuai nominal
• Simpan bukti transfer

6️⃣ **Kirim Bukti Transfer**
• Kirim foto bukti transfer ke bot
• Pastikan foto jelas dan tidak blur
• Tunggu verifikasi admin

7️⃣ **Terima Film**
Setelah pembayaran disetujui:
• Bot akan mengirimkan video film
• Selamat menonton! 🎉

**⚠️ Tips Penting**

• Pastikan pembayaran sesuai nominal
• Kirim bukti transfer yang jelas
• Transaksi pending tidak bisa dibatalkan
• Hubungi admin jika ada kendala

**❓ Butuh Bantuan?**

Hubungi admin jika:
• Video tidak dikirim
• Pembayaran ditolak tanpa alasan
• Link film tidak berfungsi

**📝 Status Transaksi**

• Menunggu Pembayaran - Silakan bayar
• Menunggu Verifikasi - Bukti sudah dikirim
• Disetujui - Video sedang dikirim
• Ditolak - Cek alasan dan coba lagi

Selamat berbelanja! 🛍️`;

  return ctx.reply(message, { parse_mode: 'Markdown' });
}

module.exports = {
  handleMenu
};
