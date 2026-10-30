'use strict';

const fs = require('fs');
const path = require('path');

const STATUS_TEXT = {
  omborda: ['🏢', 'Yukingiz qabul qilindi', 'Xitoy omborida, tez orada yo\'lga chiqariladi.'],
  yolda: ['🚛', 'Yukingiz yo\'lga chiqdi', 'O\'zbekistonga qarab ketmoqda.'],
  uzbOmbor: ['📍', 'Yukingiz O\'zbekiston omboriga yetib keldi', 'Topshirish punktidan olib ketishingiz mumkin.'],
  topshirildi: ['✅', 'Yukingiz topshirildi', 'Xizmatimizdan foydalanganingiz uchun rahmat!'],
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function fmtDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

function cargoCaption(cargo) {
  const [icon, title, hint] = STATUS_TEXT[cargo.status] || ['📦', cargo.status, ''];
  const lines = [
    `${icon} <b>${title}</b>`,
    `📦 Pochta kodi: <code>${esc(cargo.barcode)}</code>`,
    `👤 Mijoz ID: <b>${esc(cargo.client_id)}</b>`,
  ];
  if (cargo.status === 'yolda' && cargo.estimated_at) {
    lines.push(`🗓 Kutilgan yetkazish: <b>${fmtDate(cargo.estimated_at)}</b>`);
  }
  if (hint) lines.push(`\n<i>${hint}</i>`);
  return lines.join('\n');
}

class Telegram {
  constructor({ token, uploadsDir, log = console }) {
    this.uploadsDir = uploadsDir;
    this.log = log;
    this.setToken(token);
  }

  setToken(token) {
    this.token = token || '';
    this.base = `https://api.telegram.org/bot${this.token}`;
  }

  get enabled() { return Boolean(this.token); }

  async call(method, body, timeoutMs = 15000) {
    const res = await fetch(`${this.base}/${method}`, {
      method: 'POST',
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) throw new Error(`${method}: ${json.description || res.status}`);
    return json.result;
  }

  async sendMessage(chatId, text) {
    return this.call('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML' });
  }

  async sendPhoto(chatId, filename, caption) {
    const file = path.join(this.uploadsDir, path.basename(filename));
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', new Blob([fs.readFileSync(file)]), path.basename(file));
    return this.call('sendPhoto', form, 30000);
  }

  /** Yuk holati: birinchi rasm bilan (bo'lsa), aks holda oddiy xabar. Xatolarni yutadi. */
  async sendCargo(chatId, cargo) {
    if (!this.enabled) return false;
    const caption = cargoCaption(cargo);
    try {
      const first = cargo.images.find((f) => fs.existsSync(path.join(this.uploadsDir, path.basename(f))));
      if (first) await this.sendPhoto(chatId, first, caption);
      else await this.sendMessage(chatId, caption);
      return true;
    } catch (e) {
      this.log.error(`[telegram] sendCargo(${chatId}): ${e.message}`);
      return false;
    }
  }
}

module.exports = { Telegram, cargoCaption, esc };
