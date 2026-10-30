'use strict';

const { esc } = require('./telegram');

const CLIENT_ID_RE = /^yk70\d+$/i;

/** Telegram long-polling boti: mijoz ID kiritadi -> yuklari holati + rasm. */
class Bot {
  constructor({ tg, repo, log = console }) {
    this.tg = tg;
    this.repo = repo;
    this.log = log;
    this.running = false;
    this.offset = 0;
    this.gen = 0;
  }

  start() {
    if (!this.tg.enabled || this.running) return;
    this.running = true;
    this.log.log('[bot] polling boshlandi');
    this.loop(++this.gen);
  }

  stop() { this.running = false; this.gen++; }

  restart() { this.stop(); this.offset = 0; this.start(); }

  async loop(gen) {
    while (this.running && gen === this.gen) {
      try {
        const updates = await this.tg.call(
          'getUpdates', { offset: this.offset, timeout: 25, allowed_updates: ['message'] }, 35000);
        for (const u of updates) {
          if (gen !== this.gen) break;
          this.offset = u.update_id + 1;
          if (u.message) await this.handle(u.message).catch((e) => this.log.error(`[bot] ${e.message}`));
        }
      } catch (e) {
        this.log.error(`[bot] polling: ${e.message}`);
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  }

  async handle(message) {
    const chatId = message.chat?.id;
    const text = (message.text || '').trim();
    if (!chatId || !text) return;

    if (text === '/start' || text === '/help') {
      await this.tg.sendMessage(chatId,
        '👋 <b>Assalomu alaykum!</b>\n\nXitoydan O\'zbekistonga yuk tashish xizmati botiga xush kelibsiz.\n\n' +
        'Yukingiz holatini bilish uchun <b>Mijoz ID</b>ingizni yuboring (masalan: <code>YK70101</code>) ' +
        'yoki pochta kodini kiriting.\n\nBir marta ID kiritsangiz, yukingiz holati o\'zgarganda sizga avtomatik xabar keladi.');
      return;
    }

    if (text === '/my') {
      const ids = this.repo.clientsForChat(chatId);
      if (!ids.length) return void (await this.tg.sendMessage(chatId, 'Avval Mijoz IDingizni yuboring.'));
      for (const id of ids) await this.reportClient(chatId, id);
      return;
    }

    if (CLIENT_ID_RE.test(text)) {
      const client = this.repo.getClient(text);
      if (!client) {
        await this.tg.sendMessage(chatId, '❌ Bunday Mijoz ID topilmadi. Iltimos, qayta tekshirib yuboring.');
        return;
      }
      this.repo.linkChat(chatId, client.id);
      await this.reportClient(chatId, client.id, client);
      return;
    }

    const cargo = this.repo.getCargo(text);
    if (cargo) {
      await this.tg.sendCargo(chatId, cargo);
      return;
    }
    await this.tg.sendMessage(chatId,
      '❌ Topilmadi. Mijoz ID (masalan <code>YK70101</code>) yoki pochta kodini yuboring.');
  }

  async reportClient(chatId, clientId, client = this.repo.getClient(clientId)) {
    const cargos = this.repo.listCargos({ clientId });
    const name = client ? `${esc(client.first_name)} ${esc(client.last_name)}` : clientId;
    if (!cargos.length) {
      await this.tg.sendMessage(chatId,
        `👤 <b>${name}</b> (${clientId})\n\nHozircha sizga tegishli yuk qabul qilinmagan. ` +
        'Yuk omborga kelganda sizga xabar beramiz.');
      return;
    }
    await this.tg.sendMessage(chatId, `👤 <b>${name}</b> (${clientId})\n📦 Yuklar soni: <b>${cargos.length}</b>`);
    for (const c of cargos) await this.tg.sendCargo(chatId, c);
  }
}

module.exports = { Bot };
