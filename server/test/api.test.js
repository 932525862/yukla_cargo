'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDb, createRepo } = require('../src/db');
const { createApp } = require('../src/server');

async function setup() {
  const uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ct-'));
  const repo = createRepo(openDb(':memory:'));
  repo.createUser({ login: 'admin', fullName: 'Bosh Admin', password: 'secret1', role: 'admin' });
  const sent = [];
  const tg = { sendCargo: (chat, cargo) => sent.push([chat, cargo.status]) };
  const server = createApp({ repo, tg, uploadsDir, log: { error() {} } }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const login = async (l, p) => {
    const r = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ login: l, password: p }) });
    return r.ok ? (await r.json()).token : null;
  };
  const tokens = { admin: await login('admin', 'secret1') };
  const mkCall = (token) => (p, o = {}) => fetch(base + p, { ...o, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...o.headers } });
  const call = mkCall(tokens.admin);
  return { repo, sent, server, call, base, login, mkCall, token: tokens.admin };
}

test('mijoz ID lar ketma-ket va yonma-yon bir xil raqamsiz', async () => {
  const { call, server } = await setup();
  const ids = [];
  for (let i = 0; i < 14; i++) {
    const r = await call('/api/clients', { method: 'POST', body: JSON.stringify({ firstName: 'Ali', lastName: 'Vali', phone: `+99890123${1000 + i}` }) });
    ids.push((await r.json()).id);
  }
  assert.deepStrictEqual(ids.slice(8, 12), ['YK70109', 'YK70120', 'YK70121', 'YK70123']);
  // bir xil telefon -> bir xil ID
  const again = await call('/api/clients', { method: 'POST', body: JSON.stringify({ firstName: 'Ali', lastName: 'Vali', phone: '+998901231000' }) });
  assert.strictEqual((await again.json()).id, 'YK70101');
  server.close();
});

test('yuk oqimi: API kalit, rasm yuklash, status o\'zgarganda bot xabari, bot qidiruvi', async () => {
  const { repo, call, sent, server, base, token } = await setup();
  assert.strictEqual((await fetch(`${base}/api/clients`)).status, 401);
  await call('/api/clients', { method: 'POST', body: JSON.stringify({ firstName: 'A', lastName: 'B', phone: '998901234567' }) });
  repo.linkChat('555', 'YK70101');

  const form = (status) => {
    const f = new FormData();
    f.append('barcode', 'PK123'); f.append('senderId', 'yk70101'); f.append('status', status);
    if (status === 'omborda') f.append('images', new Blob([Buffer.from('jpg')], { type: 'image/jpeg' }), 'a.jpg');
    return f;
  };
  const post = (status) => fetch(`${base}/api/cargos`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form(status) });

  let r = await post('omborda');
  assert.strictEqual(r.status, 201);
  const body = await r.json();
  assert.strictEqual(body.senderId, 'YK70101');
  assert.strictEqual(body.imageUrls.length, 1);
  assert.strictEqual((await fetch(base + body.imageUrls[0])).status, 200);

  assert.strictEqual((await post('omborda')).status, 200); // o'zgarmadi -> xabar yo'q
  assert.strictEqual((await post('yolda')).status, 200);
  assert.deepStrictEqual(sent, [['555', 'omborda'], ['555', 'yolda']]);

  r = await fetch(`${base}/api/cargos`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: (() => { const f = form('yolda'); f.set('senderId', 'YK70999'); return f; })() });
  assert.strictEqual(r.status, 422);
  server.close();
});

test('bot: mijoz ID kiritilganda holat va rasm yuboriladi', async () => {
  const { Bot } = require('../src/bot');
  const repo = createRepo(openDb(':memory:'));
  repo.createClient('A', 'B', '998901234567');
  repo.upsertCargo({ barcode: 'X1', clientId: 'YK70101', status: 'yolda' }, ['p.jpg']);
  const out = [];
  const tg = { sendMessage: async (c, t) => out.push(['msg', t]), sendCargo: async (c, cargo) => out.push(['cargo', cargo.barcode]) };
  const bot = new Bot({ tg, repo });
  await bot.handle({ chat: { id: 7 }, text: 'yk70101' });
  assert.deepStrictEqual(out.map((o) => o[0]), ['msg', 'cargo']);
  assert.deepStrictEqual(repo.chatsForClient('YK70101'), ['7']);
  await bot.handle({ chat: { id: 7 }, text: 'YK55' });
  assert.match(out.at(-1)[1], /topilmadi/i);
});

test('CORS sarlavhasi bor; bot tokenini API orqali o\'zgartirib bo\'lmaydi', async () => {
  const { call, server, base } = await setup();
  const r = await call('/api/bot', { method: 'PUT', body: JSON.stringify({ token: 'abc' }) });
  assert.strictEqual(r.status, 404);
  const o = await fetch(`${base}/api/clients`, { method: 'OPTIONS' });
  assert.strictEqual(o.status, 204);
  assert.strictEqual(o.headers.get('access-control-allow-origin'), '*');
  server.close();
});

test('mijoz telegram username: tozalanadi va qidiruvda topiladi; noto\'g\'ri rad etiladi', async () => {
  const { call, server } = await setup();
  const mk = (telegram, phone) => call('/api/clients', { method: 'POST', body: JSON.stringify({ firstName: 'A', lastName: 'B', phone, telegram }) });
  let r = await mk('@ali_vali', '998901234567');
  assert.strictEqual((await r.json()).telegram, 'ali_vali');
  assert.strictEqual((await mk('ab', '998901234568')).status, 400);
  r = await call('/api/clients?q=ali_v');
  assert.strictEqual((await r.json()).length, 1);
  server.close();
});

test('hodimlar: login, ruxsatlar, hodim ismi yukda saqlanadi, nofaol hodim kira olmaydi', async () => {
  const { call, mkCall, login, server, base } = await setup();
  assert.strictEqual(await login('admin', 'xato'), null);

  const mk = await call('/api/staff', { method: 'POST', body: JSON.stringify({ login: 'mansur', fullName: 'Mansur', password: 'parol123', permissions: ['scan'] }) });
  assert.strictEqual(mk.status, 201);
  const staff = await mk.json();
  assert.strictEqual((await call('/api/staff', { method: 'POST', body: JSON.stringify({ login: 'MANSUR', fullName: 'X', password: 'parol123' }) })).status, 409);

  const t = await login('mansur', 'parol123');
  const m = mkCall(t);
  assert.strictEqual((await m('/api/staff')).status, 403);           // hodim boshqaruvi yopiq
  assert.strictEqual((await m('/api/bot')).status, 403);
  const mkClient = (c) => c('/api/clients', { method: 'POST', body: JSON.stringify({ firstName: 'A', lastName: 'B', phone: '998901234567' }) });
  assert.strictEqual((await mkClient(m)).status, 403);               // "clients" ruxsati yo'q
  await call(`/api/staff/${staff.id}`, { method: 'PUT', body: JSON.stringify({ permissions: ['scan', 'clients'] }) });
  const created = await mkClient(m);
  assert.strictEqual(created.status, 201);
  assert.strictEqual((await created.json()).createdBy, 'Mansur');

  const send = (c, status) => {
    const f = new FormData();
    f.append('barcode', 'B1'); f.append('senderId', 'YK70101'); f.append('status', status);
    return fetch(`${base}/api/cargos`, { method: 'POST', headers: { authorization: c }, body: f });
  };
  let r = await send(`Bearer ${t}`, 'omborda');
  assert.strictEqual(r.status, 201);
  assert.strictEqual((await r.json()).createdBy, 'Mansur');
  assert.strictEqual((await send(`Bearer ${t}`, 'yolda')).status, 403); // "ombor" ruxsati yo'q

  await call(`/api/staff/${staff.id}`, { method: 'PUT', body: JSON.stringify({ permissions: ['scan', 'ombor'] }) });
  r = await send(`Bearer ${t}`, 'yolda');
  assert.strictEqual((await r.json()).updatedBy, 'Mansur');

  // admin keyingi holatga o'tkazsa, oxirgi hodim admin bo'ladi
  const ar = await send(`Bearer ${(await login('admin', 'secret1'))}`, 'uzbOmbor');
  assert.strictEqual((await ar.json()).updatedBy, 'Bosh Admin');

  // nofaol qilingan hodimning sessiyasi tugaydi
  await call(`/api/staff/${staff.id}`, { method: 'PUT', body: JSON.stringify({ active: false }) });
  assert.strictEqual((await m('/api/clients')).status, 401);
  assert.strictEqual(await login('mansur', 'parol123'), null);
  server.close();
});
