# Telegram Film Store Bot

Bot Telegram berbasis Node.js untuk menjual film dengan sistem pembayaran QRIS dan verifikasi manual oleh admin.

## Fitur

- **Deep Link**: Pengguna dapat mengakses film melalui link dengan ID film
- **Manajemen Film**: Admin dapat menambah dan mengelola film melalui command Telegram
- **Pembayaran QRIS**: Sistem pembayaran menggunakan QRIS
- **Verifikasi Manual**: Admin memverifikasi bukti pembayaran secara manual
- **Pengiriman Otomatis**: Video film dikirim otomatis setelah pembayaran disetujui

## Instalasi

1. Clone repository ini
2. Install dependencies:
   ```bash
   npm install
   ```

3. Salin `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` dan isi dengan konfigurasi Anda:
   ```env
   BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN
   ADMIN_IDS=123456789,987654321
   QRIS_IMAGE_FILE_ID=YOUR_QRIS_IMAGE_FILE_ID
   BOT_USERNAME=YOUR_BOT_USERNAME
   ```

5. Jalankan bot:
   ```bash
   npm start
   ```

## Konfigurasi

### BOT_TOKEN
Token bot Telegram dari [@BotFather](https://t.me/botfather)

### ADMIN_IDS
Daftar Telegram User ID admin, dipisahkan dengan koma. User ID bisa didapat dari [@userinfobot](https://t.me/userinfobot)

### QRIS_IMAGE_FILE_ID
File ID gambar QRIS yang sudah dikirim ke bot sebelumnya. Anda bisa mengirim gambar QRIS ke bot, lalu menggunakan file_id dari pesan tersebut.

### BOT_USERNAME
Username bot tanpa @ (contoh: `example_bot`)

## Commands untuk Admin

### /addfilm
Menambahkan film baru. Harus me-reply foto poster.

**Format:**
```
/addfilm <ID> <Harga> <Judul>
```

**Contoh:**
```
/addfilm FILM001 25000 Interstellar
```

### /addmedia
Menambahkan video ke film. Harus me-reply video.

**Format:**
```
/addmedia <ID>
```

**Contoh:**
```
/addmedia FILM001
```

### /film
Menampilkan daftar film dengan pagination.

### /terima
Menerima pembayaran. Harus me-reply notifikasi transaksi.

### /tolak
Menolak pembayaran. Harus me-reply notifikasi transaksi.

**Format:**
```
/tolak <Alasan>
```

**Contoh:**
```
/tolak Bukti pembayaran tidak valid.
```

## Alur Pengguna

1. Pengguna membuka link: `https://t.me/BOT_USERNAME?start=FILM001`
2. Bot menampilkan detail film dengan tombol "Bayar Sekarang"
3. Pengguna menekan tombol, bot menampilkan QRIS
4. Pengguna membayar dan mengirim foto bukti transfer
5. Admin menerima notifikasi dan memverifikasi
6. Jika disetujui, bot mengirim video film ke pengguna

## Struktur Data

Data disimpan dalam format JSON di direktori `data/`:

- `films.json` - Data film
- `transactions.json` - Data transaksi
- `users.json` - Data pengguna
- `admins.json` - Data admin

## Teknologi

- Node.js
- Telegraf.js
- JSON Files (tanpa database SQL)

## License

ISC
