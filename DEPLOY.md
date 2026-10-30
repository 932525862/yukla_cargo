# DigitalOcean serverga joylash (Docker + HTTPS)

Natija: `https://SIZNING-DOMEN` — frontend, backend, baza va Telegram bot bitta serverda.
Tuzilma: **Caddy** (HTTPS, 80/443) → **web** (Next.js) → **server** (Express + SQLite). Baza va rasmlar Docker volume ida saqlanadi.

## 1. Droplet yaratish
- Image: **Ubuntu 24.04 LTS**, tarif: **2 GB RAM** (Basic, ~$12) yetarli. (1 GB bo'lsa build paytida xotira yetmasligi mumkin.)
- Authentication: **SSH key** (parol emas). Region: Frankfurt yoki Amsterdam.
- Droplet IP sini yozib oling.

## 2. Domen
Domen registratorida (yoki DigitalOcean → Networking → Domains) **A yozuvi** qo'shing:
`cargo.sizningdomen.uz → DROPLET_IP`. Kamera ishlashi uchun HTTPS shart, HTTPS uchun domen kerak.

## 3. Serverni tayyorlash
```bash
ssh root@DROPLET_IP
apt update && apt upgrade -y
adduser deploy && usermod -aG sudo deploy         # parol qo'ying
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
# Xavfsizlik devori: faqat SSH, HTTP, HTTPS
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
exit
```
Endi `ssh deploy@DROPLET_IP` bilan kiring.

## 4. Loyihani yuklash
Loyiha GitHubda (`yukla_cargo`). Privat bo'lsa, serverda `git clone` uchun token/deploy key kerak.
```bash
git clone https://github.com/932525862/yukla_cargo.git cargo-web
cd cargo-web
cp .env.example .env && nano .env              # DOMAIN=cargo.sizningdomen.uz
cp server/.env.example server/.env && nano server/.env
```
`server/.env` da to'ldiring:
```
ADMIN_LOGIN=admin
ADMIN_PASSWORD=KUCHLI_PAROL_YOZING
BOT_TOKEN=...          # @BotFather tokeni
```
`.env` fayllari GitHubga yuklanmaydi (`.gitignore` da), serverda qo'lda yaratiladi.

## 5. Ishga tushirish
```bash
docker compose up -d --build
docker compose logs -f          # Ctrl+C bilan chiqish
```
Birinchi build 3-5 daqiqa oladi. Keyin `https://cargo.sizningdomen.uz` ni oching va `ADMIN_LOGIN` / `ADMIN_PASSWORD` bilan kiring.
Sertifikatni Caddy o'zi oladi (DNS to'g'ri bo'lsa 1 daqiqada).

## 6. Yangilash (kodni o'zgartirgandan keyin)
Kompyuterda `git push`, serverda:
```bash
cd ~/cargo-web && git pull && docker compose up -d --build
```
Baza va rasmlar volume da, qayta build ularga tegmaydi.

## 7. Zaxira nusxa (baza + rasmlar)
```bash
./deploy/backup.sh                      # ~/backups/cargo-SANA.tar.gz, 14 kundan eskisi o'chadi
crontab -e                              # har kuni 03:00 da:
0 3 * * * cd /home/deploy/cargo-web && ./deploy/backup.sh >> /home/deploy/backup.log 2>&1
```
Nusxalarni vaqti-vaqti bilan boshqa joyga ham ko'chiring (kompyuteringizga `scp`, yoki DigitalOcean Droplet Backups yoqing, ~20%).

**Tiklash:** `docker compose down`, nusxani ochib `backup.db` ni `cargo.db` nomi bilan va `uploads/` ni volume ichiga qo'ying, keyin `docker compose up -d`.

## Foydali buyruqlar
| Maqsad | Buyruq |
|---|---|
| Holat | `docker compose ps` |
| Server loglari | `docker compose logs -f server` |
| Qayta ishga tushirish | `docker compose restart` |
| To'xtatish | `docker compose down` (volume saqlanadi; `-v` qo'shilsa **baza o'chadi!**) |

## Eslatmalar
- Admin paroli faqat **birinchi ishga tushirishda** o'qiladi. Keyin uni ilovadagi Hodimlar bo'limidan o'zgartiring.
- `ADMIN_PASSWORD` ni oddiy qoldirmang (`admin12345` internetga chiqqanda xavfli).
- Server bitta nusxada ishlashi kerak (SQLite + bot polling): bir nechta server ochmang.
