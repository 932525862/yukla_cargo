'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { nextValidNumber, formatClientId, FIRST_NUMBER } = require('./clientId');
const { hashPassword, verifyPassword, newToken, hashToken, cleanPermissions } = require('./auth');

function openDb(file) {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS clients (
      id          TEXT PRIMARY KEY,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      phone       TEXT NOT NULL UNIQUE,
      created_at  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS cargos (
      barcode        TEXT PRIMARY KEY,
      client_id      TEXT NOT NULL,
      status         TEXT NOT NULL DEFAULT 'omborda',
      batch_id       TEXT,
      estimated_at   TEXT,
      created_at     TEXT NOT NULL,
      updated_at     TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_cargos_client ON cargos(client_id);
    CREATE TABLE IF NOT EXISTS cargo_images (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      barcode  TEXT NOT NULL REFERENCES cargos(barcode) ON DELETE CASCADE,
      filename TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      login         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      full_name     TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role          TEXT NOT NULL DEFAULT 'staff',
      permissions   TEXT NOT NULL DEFAULT '[]',
      active        INTEGER NOT NULL DEFAULT 1,
      created_at    TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chats (
      chat_id    TEXT NOT NULL,
      client_id  TEXT NOT NULL REFERENCES clients(id),
      PRIMARY KEY (chat_id, client_id)
    );
  `);
  // Eski bazalar uchun yangi ustunlar
  const addColumn = (table, column, ddl) => {
    if (!db.prepare(`SELECT 1 FROM pragma_table_info('${table}') WHERE name = ?`).get(column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
    }
  };
  addColumn('clients', 'telegram', "TEXT NOT NULL DEFAULT ''");
  addColumn('clients', 'created_by', "TEXT NOT NULL DEFAULT ''");
  addColumn('cargos', 'created_by', "TEXT NOT NULL DEFAULT ''");
  addColumn('cargos', 'updated_by', "TEXT NOT NULL DEFAULT ''");
  return db;
}

const STATUSES = ['omborda', 'yolda', 'uzbOmbor', 'topshirildi'];

function createRepo(db) {
  const nextClientIdTx = db.transaction(() => {
    const row = db.prepare("SELECT value FROM meta WHERE key = 'client_counter'").get();
    const next = nextValidNumber(Math.max(FIRST_NUMBER, row ? Number(row.value) : 0));
    db.prepare(
      "INSERT INTO meta(key, value) VALUES('client_counter', ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    ).run(String(next));
    return formatClientId(next);
  });

  const createClientTx = db.transaction((firstName, lastName, phone, telegram, actor) => {
    const existing = db.prepare('SELECT * FROM clients WHERE phone = ?').get(phone);
    if (existing) {
      // Telegram keyin kiritilgan bo'lsa, mavjud mijozga qo'shib qo'yamiz
      if (telegram && !existing.telegram) {
        db.prepare('UPDATE clients SET telegram = ? WHERE id = ?').run(telegram, existing.id);
        existing.telegram = telegram;
      }
      return { client: existing, created: false };
    }
    const id = nextClientIdTx();
    db.prepare(
      'INSERT INTO clients(id, first_name, last_name, phone, telegram, created_by, created_at) VALUES(?,?,?,?,?,?,?)',
    ).run(id, firstName, lastName, phone, telegram || '', actor || '', new Date().toISOString());
    return { client: db.prepare('SELECT * FROM clients WHERE id = ?').get(id), created: true };
  });

  return {
    // --- Hodimlar va sessiyalar ---
    createUser({ login, fullName, password, role = 'staff', permissions = [] }) {
      const r = db.prepare(
        `INSERT INTO users(login, full_name, password_hash, role, permissions, active, created_at)
         VALUES(?,?,?,?,?,1,?)`,
      ).run(login, fullName, hashPassword(password), role, JSON.stringify(cleanPermissions(permissions)),
        new Date().toISOString());
      return toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid));
    },
    getUser: (id) => toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)),
    listUsers: () => db.prepare('SELECT * FROM users ORDER BY id').all().map(toUser),
    countUsers: () => db.prepare('SELECT COUNT(*) AS n FROM users').get().n,

    /** Login/parol to'g'ri va hodim faol bo'lsa foydalanuvchini qaytaradi */
    authenticate(login, password) {
      const row = db.prepare('SELECT * FROM users WHERE login = ?').get(login);
      // Hodim topilmasa ham parol hisoblanadi — vaqt bo'yicha farq sezilmasligi uchun
      const ok = verifyPassword(password, row ? row.password_hash : 'aa:bb');
      return row && ok && row.active ? toUser(row) : null;
    },

    updateUser(id, { fullName, password, permissions, active }) {
      const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
      if (!u) return undefined;
      db.prepare(
        'UPDATE users SET full_name = ?, password_hash = ?, permissions = ?, active = ? WHERE id = ?',
      ).run(
        fullName ?? u.full_name,
        password ? hashPassword(password) : u.password_hash,
        permissions ? JSON.stringify(cleanPermissions(permissions)) : u.permissions,
        active === undefined ? u.active : active ? 1 : 0,
        id,
      );
      // Parol o'zgargan yoki hodim o'chirilgan bo'lsa, eski sessiyalar tugatiladi
      if (password || active === false) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      return toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    createSession(userId, days = 30) {
      const token = newToken();
      const expires = new Date(Date.now() + days * 86400000).toISOString();
      db.prepare('INSERT INTO sessions(token_hash, user_id, expires_at) VALUES(?,?,?)')
        .run(hashToken(token), userId, expires);
      return token;
    },
    sessionUser(token) {
      const row = db.prepare(
        `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`,
      ).get(hashToken(token), new Date().toISOString());
      return toUser(row);
    },
    deleteSession: (token) => db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hashToken(token)),

    getMeta: (key) => db.prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value,
    setMeta: (key, value) =>
      db.prepare('INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
        .run(key, value),

    createClient: (f, l, p, t = '', actor = '') => createClientTx(f, l, p, t, actor),

    getClient: (id) =>
      db.prepare('SELECT * FROM clients WHERE id = ? COLLATE NOCASE').get(id),

    listClients(q) {
      if (!q) return db.prepare('SELECT * FROM clients ORDER BY rowid DESC').all();
      const like = `%${q}%`;
      return db
        .prepare(
          `SELECT * FROM clients
           WHERE id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR telegram LIKE ?
           ORDER BY rowid DESC`,
        )
        .all(like, like, like, like, like);
    },

    getCargo(barcode) {
      const c = db.prepare('SELECT * FROM cargos WHERE barcode = ? COLLATE NOCASE').get(barcode);
      return c ? withImages(c) : undefined;
    },

    listCargos: ({ clientId, status } = {}) => {
      const where = [];
      const args = [];
      if (clientId) { where.push('client_id = ? COLLATE NOCASE'); args.push(clientId); }
      if (status) { where.push('status = ?'); args.push(status); }
      const sql = `SELECT * FROM cargos ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY created_at DESC`;
      return db.prepare(sql).all(...args).map(withImages);
    },

    /** Yuk yaratadi yoki yangilaydi. Qaytaradi: { cargo, created, statusChanged, previousStatus } */
    upsertCargo: db.transaction((data, filenames) => {
      const now = new Date().toISOString();
      const existing = db.prepare('SELECT * FROM cargos WHERE barcode = ?').get(data.barcode);
      let created = false;
      let statusChanged = false;
      if (!existing) {
        created = true;
        db.prepare(
          `INSERT INTO cargos(barcode, client_id, status, batch_id, estimated_at, created_at, updated_at, created_by, updated_by)
           VALUES(?,?,?,?,?,?,?,?,?)`,
        ).run(data.barcode, data.clientId, data.status, data.batchId ?? null,
          data.estimatedAt ?? null, data.createdAt || now, now, data.actor || '', data.actor || '');
      } else {
        statusChanged = existing.status !== data.status;
        db.prepare(
          `UPDATE cargos SET client_id = ?, status = ?, batch_id = COALESCE(?, batch_id),
             estimated_at = COALESCE(?, estimated_at), updated_at = ?,
             updated_by = CASE WHEN ? THEN ? ELSE updated_by END WHERE barcode = ?`,
        ).run(data.clientId, data.status, data.batchId ?? null, data.estimatedAt ?? null, now,
          statusChanged ? 1 : 0, data.actor || '', data.barcode);
      }
      const ins = db.prepare('INSERT INTO cargo_images(barcode, filename) VALUES(?,?)');
      for (const f of filenames) ins.run(data.barcode, f);
      return {
        cargo: withImages(db.prepare('SELECT * FROM cargos WHERE barcode = ?').get(data.barcode)),
        created,
        statusChanged,
      };
    }),

    deleteCargo(barcode) {
      const imgs = db.prepare('SELECT filename FROM cargo_images WHERE barcode = ?').all(barcode);
      const r = db.prepare('DELETE FROM cargos WHERE barcode = ?').run(barcode);
      return { deleted: r.changes > 0, files: imgs.map((i) => i.filename) };
    },

    linkChat: (chatId, clientId) =>
      db.prepare('INSERT OR IGNORE INTO chats(chat_id, client_id) VALUES(?,?)').run(String(chatId), clientId),

    chatsForClient: (clientId) =>
      db.prepare('SELECT chat_id FROM chats WHERE client_id = ?').all(clientId).map((r) => r.chat_id),

    clientsForChat: (chatId) =>
      db.prepare('SELECT client_id FROM chats WHERE chat_id = ?').all(String(chatId)).map((r) => r.client_id),
  };

  function toUser(r) {
    if (!r) return undefined;
    return {
      id: r.id, login: r.login, fullName: r.full_name, role: r.role,
      permissions: r.role === 'admin' ? null : JSON.parse(r.permissions),
      active: Boolean(r.active), createdAt: r.created_at,
    };
  }

  function withImages(c) {
    const images = db.prepare('SELECT filename FROM cargo_images WHERE barcode = ? ORDER BY id').all(c.barcode);
    return { ...c, images: images.map((i) => i.filename) };
  }
}

module.exports = { openDb, createRepo, STATUSES };
