'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const compression = require('compression');
const multer = require('multer');
const { openDb, createRepo, STATUSES } = require('./db');
const { Telegram } = require('./telegram');
const { Bot } = require('./bot');
const { PERMISSIONS, STATUS_PERMISSION, cleanPermissions } = require('./auth');

function createApp({ repo, tg, bot, uploadsDir, publicDir, log = console }) {
  fs.mkdirSync(uploadsDir, { recursive: true });

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadsDir,
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, '') || '.jpg';
        cb(null, `${crypto.randomUUID()}${ext}`);
      },
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 8 },
    fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(compression());
  // Brauzerdan (web versiya) murojaat qilish uchun CORS
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type, authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => res.json({ ok: true }));
  // Rasmlar: nomi taxmin qilib bo'lmaydigan UUID, shuning uchun ochiq beriladi
  app.use('/uploads', express.static(uploadsDir, { index: false, dotfiles: 'deny' }));

  // --- Kirish (login) ---
  const attempts = new Map(); // "ip|login" -> { n, until }
  const MAX_ATTEMPTS = 8;

  app.post('/api/auth/login', (req, res) => {
    const login = String(req.body.login || '').trim();
    const password = String(req.body.password || '');
    const key = `${req.ip}|${login.toLowerCase()}`;
    const a = attempts.get(key);
    if (a && a.n >= MAX_ATTEMPTS && a.until > Date.now()) {
      return res.status(429).json({ error: 'Juda ko\'p urinish. 10 daqiqadan keyin qayta urinib ko\'ring' });
    }
    const user = login && password ? repo.authenticate(login, password) : null;
    if (!user) {
      attempts.set(key, { n: (a && a.until > Date.now() ? a.n : 0) + 1, until: Date.now() + 10 * 60000 });
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri (yoki hodim nofaol)' });
    }
    attempts.delete(key);
    res.json({ token: repo.createSession(user.id), user: publicUser(user) });
  });

  // Quyidagi barcha /api yo'llari tizimga kirgan hodimni talab qiladi
  app.use('/api', (req, res, next) => {
    const m = /^Bearer (.+)$/.exec(req.get('authorization') || '');
    const user = m && repo.sessionUser(m[1]);
    if (!user) return res.status(401).json({ error: 'Tizimga kiring' });
    req.user = user;
    req.token = m[1];
    next();
  });

  const can = (user, perm) => user.role === 'admin' || user.permissions.includes(perm);
  const requirePerm = (perm) => (req, res, next) =>
    can(req.user, perm) ? next() : res.status(403).json({ error: 'Bu amalga ruxsat yo\'q' });
  const adminOnly = (req, res, next) =>
    req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Faqat bosh admin uchun' });

  const publicUser = (u) => ({
    id: u.id, login: u.login, fullName: u.fullName, role: u.role,
    permissions: u.role === 'admin' ? Object.keys(PERMISSIONS) : u.permissions,
    active: u.active, createdAt: u.createdAt,
  });

  app.get('/api/auth/me', (req, res) => res.json(publicUser(req.user)));
  app.post('/api/auth/logout', (req, res) => { repo.deleteSession(req.token); res.status(204).end(); });

  // --- Hodimlar (faqat bosh admin) ---
  app.get('/api/permissions', adminOnly, (_req, res) => res.json(PERMISSIONS));
  app.get('/api/staff', adminOnly, (_req, res) => res.json(repo.listUsers().map(publicUser)));

  app.post('/api/staff', adminOnly, (req, res) => {
    const login = String(req.body.login || '').trim();
    const fullName = String(req.body.fullName || '').trim().replace(/\s+/g, ' ');
    const password = String(req.body.password || '');
    if (!fullName) return res.status(400).json({ error: 'Hodim ismini kiriting' });
    if (!/^[A-Za-z0-9_.-]{3,32}$/.test(login)) {
      return res.status(400).json({ error: 'Login 3–32 belgi: lotin harf, raqam, _ . -' });
    }
    if (password.length < 6) return res.status(400).json({ error: 'Parol kamida 6 belgi bo\'lsin' });
    try {
      const u = repo.createUser({ login, fullName, password, permissions: cleanPermissions(req.body.permissions) });
      res.status(201).json(publicUser(u));
    } catch (e) {
      if (/UNIQUE/.test(e.message)) return res.status(409).json({ error: 'Bu login band' });
      throw e;
    }
  });

  app.put('/api/staff/:id', adminOnly, (req, res) => {
    const target = repo.getUser(Number(req.params.id));
    if (!target) return res.status(404).json({ error: 'Hodim topilmadi' });
    if (target.role === 'admin') return res.status(400).json({ error: 'Bosh adminni o\'zgartirib bo\'lmaydi' });
    const b = req.body;
    if (b.password !== undefined && b.password !== '' && String(b.password).length < 6) {
      return res.status(400).json({ error: 'Parol kamida 6 belgi bo\'lsin' });
    }
    const fullName = b.fullName === undefined ? undefined : String(b.fullName).trim().replace(/\s+/g, ' ');
    if (fullName === '') return res.status(400).json({ error: 'Hodim ismini kiriting' });
    const u = repo.updateUser(target.id, {
      fullName,
      password: b.password ? String(b.password) : undefined,
      permissions: b.permissions === undefined ? undefined : cleanPermissions(b.permissions),
      active: b.active === undefined ? undefined : Boolean(b.active),
    });
    res.json(publicUser(u));
  });

  const publicClient = (c) => ({
    id: c.id, firstName: c.first_name, lastName: c.last_name, phone: c.phone,
    telegram: c.telegram || '', createdBy: c.created_by || '', createdAt: c.created_at,
  });
  const publicCargo = (c) => ({
    id: c.barcode,
    barcode: c.barcode,
    senderId: c.client_id,
    status: c.status,
    batchId: c.batch_id,
    estimatedDelivery: c.estimated_at,
    createdAt: c.created_at,
    createdBy: c.created_by || '',
    updatedBy: c.updated_by || '',
    imageUrls: c.images.map((f) => `/uploads/${f}`),
  });

  // --- Telegram bot sozlamalari ---
  const botInfo = async () => {
    if (!tg.enabled) return { enabled: false };
    try {
      const me = await tg.call('getMe', {}, 8000);
      return { enabled: true, username: me.username, name: me.first_name };
    } catch (e) {
      return { enabled: false, error: e.message };
    }
  };

  app.get('/api/bot', adminOnly, async (_req, res) => res.json(await botInfo()));

  app.post('/api/bot/test', adminOnly, async (req, res) => {
    const chatId = String(req.body.chatId || '').trim();
    if (!chatId) return res.status(400).json({ error: 'Chat ID kiriting' });
    try {
      await tg.sendMessage(chatId, '✅ Test xabar: bot to\'g\'ri ishlayapti!');
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  });

  // --- Mijozlar ---
  app.post('/api/clients', requirePerm('clients'), (req, res) => {
    const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
    const firstName = clean(req.body.firstName);
    const lastName = clean(req.body.lastName);
    const phone = clean(req.body.phone).replace(/[^\d+]/g, '');
    if (!firstName || !lastName) return res.status(400).json({ error: 'Ism va familya kiritilishi shart' });
    if (phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Telefon raqam noto\'g\'ri' });
    // Telegram username: "@" va havola qismlarisiz, 5–32 belgi (harf, raqam, _)
    const telegram = clean(req.body.telegram).replace(/^(https?:\/\/)?(t\.me\/)?@?/i, '');
    if (telegram && !/^[A-Za-z0-9_]{5,32}$/.test(telegram)) {
      return res.status(400).json({ error: 'Telegram username noto\'g\'ri (masalan: @ali_vali)' });
    }
    const { client, created } = repo.createClient(firstName, lastName, phone, telegram, req.user.fullName);
    res.status(created ? 201 : 200).json({ ...publicClient(client), created });
  });

  app.get('/api/clients', (req, res) => {
    res.json(repo.listClients(String(req.query.q || '').trim()).map(publicClient));
  });

  app.get('/api/clients/:id', (req, res) => {
    const c = repo.getClient(req.params.id);
    if (!c) return res.status(404).json({ error: 'Mijoz topilmadi' });
    res.json(publicClient(c));
  });

  // --- Yuklar ---
  app.get('/api/cargos', (req, res) => {
    res.json(repo.listCargos({ clientId: req.query.clientId, status: req.query.status }).map(publicCargo));
  });

  // Yaratish yoki yangilash (barkod bo'yicha). Rasmlar: multipart "images".
  app.post('/api/cargos', upload.array('images', 8), async (req, res) => {
    const files = (req.files || []).map((f) => f.filename);
    const discard = () => files.forEach((f) => fs.rm(path.join(uploadsDir, f), () => {}));
    try {
      const b = req.body;
      const barcode = String(b.barcode || '').trim();
      const status = b.status || 'omborda';
      if (!barcode) { discard(); return res.status(400).json({ error: 'barcode kerak' }); }
      if (!STATUSES.includes(status)) { discard(); return res.status(400).json({ error: 'status noto\'g\'ri' }); }
      const client = repo.getClient(String(b.senderId || '').trim());
      if (!client) { discard(); return res.status(422).json({ error: `Mijoz ID topilmadi: ${b.senderId}` }); }

      // Ruxsat: yangi yuk -> "scan", holat o'zgarishi -> shu holatga o'tkazish ruxsati
      const existing = repo.getCargo(barcode);
      const needed = [];
      if (!existing) needed.push('scan');
      if (!existing ? status !== 'omborda' : existing.status !== status) needed.push(STATUS_PERMISSION[status]);
      const missing = needed.find((p) => !can(req.user, p));
      if (missing) { discard(); return res.status(403).json({ error: `Ruxsat yo'q: ${PERMISSIONS[missing]}` }); }

      const { cargo, created, statusChanged } = repo.upsertCargo({
        barcode,
        clientId: client.id,
        status,
        batchId: b.batchId || null,
        estimatedAt: b.estimatedDelivery || null,
        createdAt: b.createdAt || null,
        actor: req.user.fullName,
      }, files);

      if (created || statusChanged) {
        for (const chatId of repo.chatsForClient(client.id)) tg.sendCargo(chatId, cargo);
      }
      res.status(created ? 201 : 200).json(publicCargo(cargo));
    } catch (e) {
      discard();
      log.error(e);
      res.status(500).json({ error: 'Server xatosi' });
    }
  });

  app.delete('/api/cargos/:barcode', requirePerm('ombor'), (req, res) => {
    const { deleted, files } = repo.deleteCargo(req.params.barcode);
    files.forEach((f) => fs.rm(path.join(uploadsDir, path.basename(f)), () => {}));
    res.status(deleted ? 204 : 404).end();
  });

  // Web ilova (Flutter web build) — bir xil manzildan beriladi
  if (publicDir && fs.existsSync(path.join(publicDir, 'index.html'))) {
    app.use(express.static(publicDir, {
      index: 'index.html',
      // index.html va service worker har doim yangi olinadi; qolgan fayllar keshlanadi
      setHeaders: (res, file) => {
        const name = path.basename(file);
        const fresh = ['index.html', 'flutter_service_worker.js', 'flutter_bootstrap.js', 'version.json', 'manifest.json'];
        res.setHeader('Cache-Control', fresh.includes(name) ? 'no-cache' : 'public, max-age=86400');
      },
    }));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.message });
    log.error(err);
    res.status(500).json({ error: 'Server xatosi' });
  });

  return app;
}

if (require.main === module) {
  const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));
  const uploadsDir = path.join(dataDir, 'uploads');
  const port = Number(process.env.PORT || 3000);

  const repo = createRepo(openDb(path.join(dataDir, 'cargo.db')));
  fs.mkdirSync(uploadsDir, { recursive: true });
  // Birinchi ishga tushirishda bosh admin yaratiladi
  if (repo.countUsers() === 0) {
    const login = process.env.ADMIN_LOGIN || 'admin';
    const generated = !process.env.ADMIN_PASSWORD;
    const password = process.env.ADMIN_PASSWORD || require('crypto').randomBytes(6).toString('hex');
    repo.createUser({ login, fullName: process.env.ADMIN_NAME || 'Admin', password, role: 'admin' });
    console.log(`[+] Bosh admin yaratildi. Login: ${login}${generated ? `  Parol: ${password}` : ''}`);
  }
  // Bot tokeni faqat .env dan olinadi
  const tg = new Telegram({ token: process.env.BOT_TOKEN || '', uploadsDir });
  if (!tg.enabled) console.warn('[!] BOT_TOKEN o\'rnatilmagan — Telegram bot o\'chiq');
  const bot = new Bot({ tg, repo });

  const server = createApp({ repo, tg, bot, uploadsDir, publicDir: path.join(__dirname, '..', 'public') }).listen(port, () => {
    console.log(`Server ${port}-portda ishlamoqda`);
    bot.start();
  });
  const shutdown = () => { bot.stop(); server.close(() => process.exit(0)); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = { createApp };
