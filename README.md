# Kabaddi Kounter Live Score Backend

Backend sederhana untuk memenuhi spesifikasi live score Android.

## Fitur

- `GET /match` untuk mengambil daftar pertandingan
- `POST /match/:id/subscribe` untuk mendaftarkan token FCM
- `POST /match/:id/score` untuk simulasi perubahan skor dan pengiriman push notification
- `POST /match/:id/end` untuk mengakhiri pertandingan dan mengirim notifikasi

## Struktur

- `src/sampleMatches.js` — data awal pertandingan
- `src/matchStore.js` — penyimpanan in-memory untuk match dan subscription
- `src/fcmService.js` — integrasi Firebase Admin SDK
- `src/app.js` — konfigurasi Express dan route
- `src/server.js` — entrypoint server
- `test/app.test.js` — integration test

## Menjalankan

```bash
cd backend
npm install
npm start
```

Default port: `8080`.

## Testing

```bash
cd backend
npm test
```

## Konfigurasi Firebase

Backend akan tetap jalan tanpa credential Firebase, tetapi pengiriman FCM tidak aktif sampai credential dikonfigurasi.

Opsi umum:

1. Set environment variable `GOOGLE_APPLICATION_CREDENTIALS` ke file service account Firebase
2. Jalankan server
3. Pastikan `firebase-admin` dapat menginisialisasi application default credentials

## Endpoint examples

### GET /match

```bash
curl http://localhost:8080/match
```

### Subscribe

```bash
curl -X POST http://localhost:8080/match/1/subscribe ^
  -H "Content-Type: application/json" ^
  -d "{\"token\":\"YOUR_FCM_TOKEN\",\"deviceName\":\"Pixel 8\"}"
```

### Update score

```bash
curl -X POST http://localhost:8080/match/1/score ^
  -H "Content-Type: application/json" ^
  -d "{\"team\":\"A\",\"increment\":1}"
```

### End match

```bash
curl -X POST http://localhost:8080/match/1/end
```

