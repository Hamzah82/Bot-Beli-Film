# PRD.md — Telegram Film Store Bot

## 1. Project Overview

### 1.1 Deskripsi

Telegram Film Store Bot adalah bot Telegram berbasis Node.js yang memungkinkan pengguna membeli film melalui sistem pembayaran QRIS dengan verifikasi manual oleh admin.

Pengguna masuk melalui deep link Telegram yang memuat ID film. Bot kemudian menampilkan detail film, harga, dan poster. Setelah pengguna melakukan pembayaran dan mengirimkan bukti transfer, admin akan memverifikasi transaksi. Jika pembayaran disetujui, bot otomatis mengirimkan video film kepada pengguna.

Admin dapat mengelola katalog film, poster, video, dan transaksi langsung melalui command Telegram.

### 1.2 Tujuan

- Menyediakan sistem penjualan film melalui Telegram.
- Mempermudah proses pembelian film.
- Mengotomatisasi pengiriman film setelah pembayaran disetujui.
- Mempermudah admin mengelola film dan transaksi.
- Menggunakan penyimpanan JSON tanpa database SQL.

---

## 2. Technology Stack

| Komponen | Teknologi |
|---|---|
| Runtime | Node.js |
| Language | JavaScript |
| Telegram Framework | Telegraf.js |
| Storage | JSON Files |
| File System | Node.js fs/promises |
| Configuration | dotenv |
| Media Storage | Telegram File ID |
| Payment | QRIS |
| Package Manager | npm |

### 2.1 Storage Requirements

Seluruh data aplikasi harus disimpan menggunakan file JSON.

Dilarang menggunakan:
- SQLite
- MySQL
- PostgreSQL
- MongoDB
- Database SQL lainnya

Gunakan `fs/promises` untuk operasi baca dan tulis file JSON.

Implementasikan mekanisme atomic write dan write queue untuk menghindari kerusakan data serta konflik penulisan.

---

## 3. User Flow

### 3.1 Start Bot

Pengguna mendapatkan QR Code dari postingan Instagram yang mengarah ke deep link Telegram.

Format:

`https://t.me/BOT_USERNAME?start=FILM_ID`

Contoh:

`https://t.me/example_bot?start=FILM001`

Ketika pengguna menekan tombol Start:

1. Bot membaca parameter ID film.
2. Bot mencari film di `films.json`.
3. Bot memeriksa ketersediaan poster dan video.
4. Jika film ditemukan dan tersedia, bot menampilkan detail film.
5. Jika film tidak ditemukan, bot menampilkan pesan kesalahan.

Jika film tidak ditemukan:

> Maaf, film yang kamu cari tidak ditemukan atau sudah tidak tersedia.

Jika film belum memiliki video, pembelian tidak dapat dilakukan.

### 3.2 Film Detail

Bot menampilkan pesan berupa foto poster film dengan caption:

**DETAIL FILM**

Judul: Interstellar

Harga: Rp25.000

Tombol inline:

`[ 💳 Bayar Sekarang ]`

Ketentuan:
- Poster menggunakan Telegram `file_id`.
- Harga menggunakan format Rupiah.
- Tidak mengirim video pada tahap ini.
- Hanya menampilkan satu film berdasarkan ID dari deep link.

### 3.3 Payment Process

Ketika pengguna menekan tombol `Bayar Sekarang`:

1. Bot memeriksa kembali ketersediaan film.
2. Bot membuat transaksi baru.
3. Transaksi disimpan ke `transactions.json`.
4. Bot mengganti poster film dengan gambar QRIS.
5. Caption pesan diganti menjadi instruksi pembayaran.
6. Tombol pembayaran dihapus.

Gunakan `editMessageMedia` agar pesan sebelumnya berubah tanpa membuat pesan baru.

Format caption:

**PEMBAYARAN FILM**

Detail Pembelian:
- Film: Interstellar
- ID Film: FILM001
- Total: Rp25.000
- ID Transaksi: TRX-XXXXXXXX

Instruksi:
1. Scan QRIS di atas.
2. Lakukan pembayaran sesuai nominal.
3. Setelah pembayaran berhasil, kirimkan foto atau screenshot bukti transfer ke bot.
4. Tunggu verifikasi dari admin.

Status: Menunggu pembayaran.

### 3.4 Upload Payment Proof

Pengguna mengirimkan bukti pembayaran berupa foto.

Bot harus:
1. Memastikan pengguna memiliki transaksi berstatus `WAITING_PAYMENT`.
2. Memastikan pesan yang diterima berupa foto.
3. Mengambil `file_id` foto.
4. Menyimpan `proof_file_id` ke transaksi.
5. Mengubah status menjadi `WAITING_VERIFICATION`.
6. Mengirimkan notifikasi kepada admin.

Pesan kepada pengguna:

> Bukti pembayaran berhasil dikirim!
>
> Pembayaran kamu sedang menunggu verifikasi admin. Mohon tunggu hingga proses verifikasi selesai.

Jika pengguna mengirim teks atau jenis pesan lain, bot meminta pengguna mengirimkan bukti pembayaran berupa foto.

---

## 4. Admin Management

### 4.1 Admin Authorization

Seluruh command admin hanya dapat digunakan oleh Telegram User ID yang terdaftar dalam `admins.json` atau konfigurasi admin.

Ketentuan:
- Gunakan Telegram User ID sebagai identitas.
- Jangan menggunakan username sebagai sistem autentikasi.
- Semua handler admin harus melewati middleware authorization.
- Pengguna non-admin tidak boleh menjalankan command administrasi.

### 4.2 Add Film — `/addfilm`

Format:

`/addfilm <ID> <Harga> <Judul>`

Contoh:

`/addfilm FILM001 25000 Interstellar`

Command harus dilakukan dengan cara me-reply sebuah foto.

Foto tersebut akan digunakan sebagai poster film.

Ketentuan:
- ID film harus unik.
- Harga harus berupa angka positif.
- Judul dapat mengandung spasi.
- Foto yang direply harus berupa foto Telegram.
- Poster disimpan menggunakan Telegram `file_id`.
- Data film disimpan ke `films.json`.
- Field `video_file_id` awalnya bernilai `null`.

Jika berhasil:

> Film berhasil ditambahkan!
>
> ID: FILM001
> Judul: Interstellar
> Harga: Rp25.000
>
> Poster berhasil disimpan.
>
> Tambahkan video menggunakan `/addmedia FILM001` dengan me-reply video.

### 4.3 Add Media — `/addmedia`

Format:

`/addmedia <ID>`

Contoh:

Admin mengirim video, kemudian me-reply video tersebut menggunakan:

`/addmedia FILM001`

Ketentuan:
- Command wajib me-reply sebuah video.
- Bot mencari film berdasarkan ID.
- Bot mengambil `file_id` video.
- Bot menyimpan `video_file_id` ke `films.json`.
- Jika video sebelumnya sudah tersedia, video lama digantikan.
- Jika ID tidak ditemukan, bot memberikan pesan kesalahan.

Jika berhasil:

> Media film berhasil ditambahkan!
>
> ID: FILM001
> Judul: Interstellar
>
> Film sekarang tersedia untuk dibeli.

### 4.4 Film List — `/film`

Command:

`/film`

Menampilkan daftar film yang telah terdaftar dalam sistem menggunakan pagination.

Ketentuan pagination:
- Satu halaman menampilkan satu film.
- Tombol kiri untuk halaman sebelumnya.
- Tombol kanan untuk halaman berikutnya.
- Pesan diperbarui menggunakan `editMessageMedia` atau `editMessageCaption`.
- Tidak membuat pesan baru setiap kali berpindah halaman.

Informasi yang ditampilkan:

1. Poster film.
2. ID film.
3. Judul film.
4. Harga film.
5. Status ketersediaan video.
6. Link share.

Contoh tampilan:

**FILM MANAGEMENT**

[Poster Film]

Judul: Interstellar

ID: FILM001

Harga: Rp25.000

Media: Tersedia

Link Share:
`https://t.me/BOT_USERNAME?start=FILM001`

Inline keyboard:

`[ ◀️ ] [ 1/10 ] [ ▶️ ]`

Jika belum ada film:

> Belum ada film yang terdaftar.

---

## 5. Payment Verification

### 5.1 Admin Notification

Ketika pengguna mengirimkan bukti pembayaran, bot mengirimkan notifikasi kepada admin.

Notifikasi harus berupa foto bukti transfer dengan caption:

**PEMBAYARAN MENUNGGU VERIFIKASI**

Detail Transaksi:
- ID Transaksi: TRX-XXXXXXXX
- ID Film: FILM001
- Judul Film: Interstellar
- Harga: Rp25.000

Detail Pembeli:
- Nama: Nama Telegram
- Username: @username
- Telegram ID: 123456789

Bukti pembayaran terlampir.

Inline keyboard:

`[ ✅ Terima ] [ ❌ Tolak ]`

Notifikasi harus memiliki identitas transaksi yang jelas agar admin dapat memproses beberapa transaksi secara bersamaan.

### 5.2 Accept Payment — `/terima`

Admin dapat menerima pembayaran dengan me-reply notifikasi transaksi menggunakan:

`/terima`

Admin juga dapat menekan tombol `Terima`.

Ketika transaksi diterima:

1. Bot mencari transaksi berdasarkan ID transaksi pada pesan notifikasi.
2. Bot memastikan status transaksi adalah `WAITING_VERIFICATION`.
3. Bot mengubah status menjadi `APPROVED`.
4. Bot menyimpan Telegram User ID admin yang memproses.
5. Bot mengirimkan notifikasi kepada pengguna.
6. Bot mengirimkan video film menggunakan `sendVideo`.
7. Bot memperbarui notifikasi admin agar menunjukkan bahwa transaksi telah diterima.

Pesan kepada pengguna:

> PEMBAYARAN BERHASIL!
>
> Pembayaran kamu telah diverifikasi dan disetujui oleh admin.
>
> Film: Interstellar
> ID Transaksi: TRX-XXXXXXXX
>
> Selamat menonton!

Setelah pesan tersebut, bot langsung mengirimkan video film.

Ketentuan:
- Video hanya dikirim jika transaksi berstatus `APPROVED`.
- Transaksi yang sudah diproses tidak boleh diterima kembali.
- Bot tidak boleh mengirimkan video berulang kali akibat callback yang sama.
- Jika pengiriman video gagal, transaksi tetap tercatat dan harus tersedia mekanisme pengiriman ulang yang aman.

### 5.3 Reject Payment — `/tolak`

Format:

`/tolak <Alasan>`

Contoh:

`/tolak Bukti pembayaran tidak valid.`

Command wajib me-reply notifikasi transaksi.

Ketika transaksi ditolak:

1. Bot mencari transaksi berdasarkan ID transaksi.
2. Bot memastikan transaksi belum diproses.
3. Bot mengubah status menjadi `REJECTED`.
4. Bot menyimpan alasan penolakan.
5. Bot menyimpan Telegram User ID admin.
6. Bot mengirimkan notifikasi kepada pengguna.
7. Bot memperbarui notifikasi admin.

Pesan kepada pengguna:

> PEMBAYARAN DITOLAK
>
> Mohon maaf, pembayaran kamu tidak dapat diverifikasi.
>
> Alasan: Bukti pembayaran tidak valid.
>
> Silakan periksa kembali pembayaran kamu dan lakukan pemesanan ulang jika diperlukan.

Ketentuan:
- Alasan wajib diisi.
- Admin wajib me-reply notifikasi transaksi.
- Transaksi yang sudah diproses tidak dapat ditolak kembali.
- Video tidak boleh dikirim jika transaksi ditolak.

---

## 6. Database Structure — JSON

Seluruh penyimpanan menggunakan file JSON.

### 6.1 Project Storage

Direktori penyimpanan:

```text
data/
├── films.json
├── transactions.json
├── users.json
└── admins.json
```

### 6.2 films.json

Menyimpan data seluruh film.

Contoh:

```json
{
  "films": [
    {
      "id": "FILM001",
      "title": "Interstellar",
      "price": 25000,
      "poster_file_id": "TELEGRAM_POSTER_FILE_ID",
      "video_file_id": "TELEGRAM_VIDEO_FILE_ID",
      "created_at": "2026-11-08T10:00:00.000Z",
      "updated_at": "2026-11-08T10:00:00.000Z"
    }
  ]
}
```

### 6.3 transactions.json

Menyimpan seluruh transaksi pembelian.

Contoh:

```json
{
  "transactions": [
    {
      "id": "TRX-ABC12345",
      "user_id": 123456789,
      "film_id": "FILM001",
      "amount": 25000,
      "status": "WAITING_VERIFICATION",
      "proof_file_id": "TELEGRAM_PROOF_FILE_ID",
      "rejection_reason": null,
      "admin_id": null,
      "admin_message_id": null,
      "admin_chat_id": null,
      "delivery_status": "PENDING",
      "created_at": "2026-11-08T10:00:00.000Z",
      "updated_at": "2026-11-08T10:05:00.000Z"
    }
  ]
}
```

### 6.4 users.json

Menyimpan informasi pengguna.

Contoh:

```json
{
  "users": [
    {
      "telegram_id": 123456789,
      "username": "example_user",
      "first_name": "Example",
      "created_at": "2026-11-08T10:00:00.000Z"
    }
  ]
}
```

### 6.5 admins.json

Menyimpan daftar administrator.

Contoh:

```json
{
  "admins": [
    {
      "telegram_id": 123456789
    }
  ]
}
```

### 6.6 Transaction Status

Status transaksi:

| Status | Keterangan |
|---|---|
| WAITING_PAYMENT | Menunggu pembayaran |
| WAITING_VERIFICATION | Menunggu verifikasi admin |
| APPROVED | Pembayaran diterima |
| REJECTED | Pembayaran ditolak |

Status pengiriman:

| Status | Keterangan |
|---|---|
| PENDING | Belum dikirim |
| SENT | Video berhasil dikirim |
| FAILED | Pengiriman video gagal |

---

## 7. JSON Storage Engine

Buat satu modul khusus bernama `jsonStorage.js` sebagai pusat seluruh operasi JSON.

Fungsi yang direkomendasikan:

- `readJSON(filename)`
- `writeJSON(filename, data)`
- `updateJSON(filename, updater)`
- `initializeStorage()`

Ketentuan implementasi:

1. Gunakan Node.js `fs/promises`.
2. Semua file JSON harus diinisialisasi otomatis jika belum tersedia.
3. File JSON harus memiliki struktur default yang valid.
4. Gunakan atomic write melalui temporary file dan rename.
5. Gunakan write queue atau mutex untuk mencegah konflik penulisan.
6. Validasi struktur JSON sebelum menyimpan.
7. Tangani JSON yang rusak dengan error logging dan mekanisme pemulihan yang aman.
8. Seluruh handler dan service harus mengakses data melalui storage module.
9. Jangan melakukan penulisan langsung ke file JSON dari handler.
10. Pastikan proses update tidak menyebabkan perubahan data yang saling menimpa.

---

## 8. Business Rules

1. Setiap film memiliki ID unik.
2. Setiap film harus memiliki poster.
3. Film harus memiliki video sebelum dapat dibeli.
4. Harga film harus berupa angka positif dalam Rupiah.
5. Pengguna mengirimkan bukti pembayaran dalam bentuk foto.
6. Pembayaran diverifikasi secara manual oleh admin.
7. Setiap transaksi memiliki ID unik.
8. Setiap transaksi hanya dapat diproses satu kali.
9. Harga transaksi disimpan sebagai snapshot.
10. Video hanya boleh dikirim setelah transaksi disetujui.
11. Pengguna tidak dapat mengakses command admin.
12. Admin dapat memperbarui poster dan video film.
13. Link share harus memuat ID film.
14. Bot tidak boleh mengirimkan video berulang kali karena callback yang sama.
15. Film yang sudah memiliki transaksi tidak boleh dihapus sembarangan karena dapat merusak referensi transaksi.
16. Setiap perubahan transaksi harus disimpan ke JSON.
17. Jika QRIS belum dikonfigurasi, pembelian tidak dapat dilanjutkan.

---

## 9. Security & Reliability

- Admin authorization menggunakan Telegram User ID.
- Validasi semua parameter command.
- Bot Token disimpan dalam `.env`.
- Jangan menyimpan informasi sensitif dalam source code.
- Gunakan atomic write untuk penyimpanan JSON.
- Gunakan write queue atau mutex.
- Cegah pengguna mengirim bukti untuk transaksi milik pengguna lain.
- Cegah pemrosesan transaksi ganda.
- Cegah pengiriman video sebelum persetujuan admin.
- Catat error Telegram API.
- Catat aktivitas admin.
- Pastikan data tetap tersedia setelah bot restart.
- Batasi akses terhadap direktori data.

---

## 10. Project Structure

```text
telegram-film-bot/
├── src/
│   ├── bot.js
│   ├── config/
│   │   └── index.js
│   ├── database/
│   │   ├── index.js
│   │   └── jsonStorage.js
│   ├── handlers/
│   │   ├── start.js
│   │   ├── payment.js
│   │   ├── proof.js
│   │   ├── admin.js
│   │   └── film.js
│   ├── middlewares/
│   │   ├── admin.js
│   │   └── user.js
│   ├── services/
│   │   ├── filmService.js
│   │   ├── transactionService.js
│   │   └── telegramService.js
│   └── utils/
│       ├── formatCurrency.js
│       └── generateTransactionId.js
├── data/
│   ├── films.json
│   ├── transactions.json
│   ├── users.json
│   └── admins.json
├── .env
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 11. Environment Variables

Contoh `.env.example`:

```env
BOT_TOKEN=YOUR_TELEGRAM_BOT_TOKEN

ADMIN_IDS=123456789,987654321

QRIS_IMAGE_FILE_ID=YOUR_QRIS_IMAGE_FILE_ID

BOT_USERNAME=YOUR_BOT_USERNAME
```

`ADMIN_IDS` dapat berisi beberapa Telegram User ID yang dipisahkan dengan koma.

`QRIS_IMAGE_FILE_ID` digunakan untuk menampilkan gambar QRIS.

---

## 12. Error Handling

| Kondisi | Respons |
|---|---|
| Film tidak ditemukan | Film tidak tersedia |
| Film belum memiliki video | Film belum tersedia untuk dibeli |
| ID film sudah digunakan | ID sudah terdaftar |
| Admin tidak terdaftar | Akses ditolak |
| Command tanpa reply foto | Minta admin reply foto |
| Command tanpa reply video | Minta admin reply video |
| Bukti bukan foto | Minta pengguna mengirim foto |
| Transaksi sudah diproses | Transaksi sudah selesai |
| Alasan penolakan kosong | Minta alasan penolakan |
| QRIS belum dikonfigurasi | Pembayaran tidak tersedia |
| JSON rusak | Catat error dan hentikan operasi tulis yang berisiko |
| Gagal mengirim video | Tandai delivery sebagai FAILED |

---

## 13. Acceptance Criteria

### User

- [ ] Pengguna dapat membuka bot menggunakan deep link.
- [ ] Bot membaca ID film dari parameter `/start`.
- [ ] Bot menampilkan poster, judul, dan harga.
- [ ] Tombol Bayar Sekarang berfungsi.
- [ ] Poster berubah menjadi gambar QRIS setelah pembayaran dimulai.
- [ ] Pengguna dapat mengirim foto bukti pembayaran.
- [ ] Bot memberikan konfirmasi penerimaan bukti.
- [ ] Pengguna menerima notifikasi pembayaran diterima atau ditolak.
- [ ] Video dikirim setelah pembayaran disetujui.

### Admin

- [ ] Admin dapat menambahkan film menggunakan `/addfilm`.
- [ ] Admin dapat menambahkan video menggunakan `/addmedia`.
- [ ] Admin dapat melihat katalog melalui `/film`.
- [ ] Pagination menampilkan satu film per halaman.
- [ ] Admin dapat melihat link share.
- [ ] Admin menerima bukti transfer beserta detail transaksi.
- [ ] Admin dapat menerima pembayaran menggunakan `/terima`.
- [ ] Admin dapat menolak pembayaran menggunakan `/tolak <Alasan>`.
- [ ] Admin dapat memproses beberapa transaksi secara independen.
- [ ] Pengguna non-admin tidak dapat menggunakan command administrasi.

### Storage

- [ ] Semua data disimpan dalam file JSON.
- [ ] Tidak ada penggunaan database SQL.
- [ ] Data otomatis dibuat ketika bot pertama kali dijalankan.
- [ ] Data tetap tersimpan setelah bot restart.
- [ ] Penulisan JSON menggunakan atomic write.
- [ ] Penulisan bersamaan tidak menyebabkan kehilangan data.

---

## 14. Development Priority

Urutan pengembangan:

1. Inisialisasi project Node.js dan Telegraf.
2. Implementasi JSON Storage Engine.
3. Implementasi database JSON dan initialization.
4. Implementasi admin authorization.
5. Implementasi `/addfilm`.
6. Implementasi `/addmedia`.
7. Implementasi `/film` dengan pagination.
8. Implementasi deep link dan `/start`.
9. Implementasi tampilan detail film.
10. Implementasi pembayaran QRIS.
11. Implementasi upload bukti pembayaran.
12. Implementasi notifikasi admin.
13. Implementasi `/terima` dan `/tolak`.
14. Implementasi pengiriman video otomatis.
15. Implementasi error handling dan logging.
16. Pengujian transaksi dan penyimpanan data.

---

## 15. MVP Scope

### Included

- Telegram bot berbasis Node.js.
- Penyimpanan JSON.
- Manajemen film melalui command.
- Poster dan video menggunakan Telegram File ID.
- Deep link film.
- Tampilan detail film.
- Pembayaran QRIS.
- Upload bukti transfer.
- Verifikasi pembayaran manual.
- Pengiriman video otomatis.
- Pagination katalog admin.

### Excluded

- Payment gateway otomatis.
- Verifikasi QRIS otomatis.
- Sistem saldo atau deposit.
- Refund otomatis.
- Membership dan subscription.
- Dashboard website.
- Statistik penjualan.
- Kupon dan diskon.
- Sistem pencarian film.

---

## 16. Final Development Notes

Aplikasi harus dibuat modular, sederhana, dan mudah dikembangkan.

Prioritaskan penggunaan Telegram `file_id` agar bot tidak perlu mengunduh dan mengunggah ulang poster maupun video.

Gunakan inline keyboard untuk interaksi pengguna dan admin.

Gunakan edit message untuk memperbarui tampilan agar percakapan Telegram tetap rapi.

**Core Workflow:**

`User Start → Film Detail → Payment → Upload Proof → Admin Verification → Video Delivery`

**Storage Principle:**

`All persistent application data must be stored in JSON files. No SQL or external database is permitted.`

Jangan menambahkan fitur di luar scope MVP tanpa kebutuhan yang jelas.
