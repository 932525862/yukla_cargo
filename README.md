# Cargo Tracker — web versiya

Xitoydan O'zbekistonga yuk tashish nazorati. **Faqat web**: brauzerda (telefon va kompyuter) ishlaydi.

| Qism | Texnologiya | Papka |
|---|---|---|
| Front-end | Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS | `web/` |
| Back-end | Node.js · Express · SQLite · Telegram bot | `server/` |

## Imkoniyatlar
- **Login/parol** bilan kirish; rolga qarab: **bosh admin → Admin panel**, **hodim → Hodim kabineti**.
- **Hodimlar** (admin): qo'shish, har bir funksiyaga ruxsat berish/uzish (majburiy emas), faolsizlantirish, parol o'zgartirish.
- **Mijozga ID berish**: ism, familya, telefon (davlat kodi bilan), telegram → `YK70101, YK70102 …` (yonma-yon bir xil raqamlar — `YK70110`, `YK70144` — berilmaydi).
- **Skaner**: kamera bilan shtrix kod o'qish yoki qo'lda kiritish, mijoz ID, 4 tagacha rasm.
- **Ombor → Yo'lda → UZB ombor → Topshirish** jarayoni, partiyalar, qidiruv, ko'plab tanlab o'tkazish.
- Har yuk kartasida mijoz ismi, telefoni, telegrami va **amalni bajargan hodim ismi** ko'rinadi.
- **Telegram bot** (serverda ishlaydi): mijoz ID sini yozsa, yuk holati va rasmi chiqadi; holat o'zgarganda avtomatik xabar boradi. Bot tokeni Admin paneldan kiritiladi.

## Ishga tushirish (VS Code terminalida)
Node.js 20+ kerak.
```bash
npm run install:all          # bir marta
cp server/.env.example server/.env     # ADMIN_PASSWORD ni yozing!
npm run dev                  # server (4000) + web (3100)
```
Brauzerda: **http://localhost:3100** — login: `ADMIN_LOGIN`, parol: `ADMIN_PASSWORD` (`server/.env` da).
Parol bo'sh qoldirilsa, tasodifiy parol yaratilib server terminalida chiqadi (faqat birinchi ishga tushirishda).

Ishlab chiqarish uchun: `npm run build && npm start`.

## Serverga joylash
```bash
cp server/.env.example server/.env && nano server/.env    # ADMIN_PASSWORD, ixtiyoriy BOT_TOKEN
docker compose up -d --build                               # http://SERVER_IP:3100
```
Baza va rasmlar `cargo-data` volume ida saqlanadi.

**HTTPS shart (kamera uchun).** Telefon brauzeri kameraga faqat HTTPS (yoki localhost) da ruxsat beradi.
Domen oling va Caddy qo'ying (`Caddyfile`): `cargo.sizningdomen.uz { reverse_proxy localhost:3100 }`.
HTTPS'siz ham ishlaydi, faqat shtrix kodni qo'lda kiritish kerak bo'ladi.

## Telefonga o'rnatish
Brauzer menyusi → **"Bosh ekranga qo'shish"** — ilova kabi alohida oynada ochiladi.

## Tuzilma
```
web/app/(app)/      sahifalar: home, scan, ombor, yolda, topshirish, clients, staff, bot
web/components/     umumiy qismlar (Sheet, Scanner, CargoCard, BottomNav ...)
web/lib/            api.ts (server bilan aloqa), auth.tsx, hooks.ts
web/next.config.mjs /api va /uploads ni backend ga yo'naltiradi (BACKEND_URL, standart http://localhost:4000)
server/src/         Express API, SQLite, Telegram bot
```

## Hodim ruxsatlari
`Skaner` (yangi yuk qabul qilish) · `Ombor` (yo'lga chiqarish, o'chirish) · `Yo'lda` (UZB omborga o'tkazish) · `Topshirish` · `Mijozga ID`.
Ruxsatlar **serverda ham tekshiriladi** — brauzer orqali aylanib o'tib bo'lmaydi.
# yukla_cargo
