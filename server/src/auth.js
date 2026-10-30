'use strict';

const crypto = require('crypto');

/** Hodimga beriladigan ruxsatlar (kalit -> ilovadagi nomi) */
const PERMISSIONS = {
  scan: 'Skaner (yuk qabul qilish)',
  ombor: "Ombor (yo'lga chiqarish)",
  yolda: "Yo'lda (UZB omborga o'tkazish)",
  topshirish: 'Topshirish',
  clients: 'Mijozga ID berish',
};

/** Yuk holatiga o'tkazish uchun kerak bo'ladigan ruxsat */
const STATUS_PERMISSION = {
  omborda: 'scan',
  yolda: 'ombor',
  uzbOmbor: 'yolda',
  topshirildi: 'topshirish',
};

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [saltHex, hashHex] = String(stored).split(':');
  if (!saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), want.length);
  return crypto.timingSafeEqual(got, want);
}

const newToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');

/** Faqat ma'lum ruxsat kalitlarini qoldiradi */
const cleanPermissions = (list) =>
  [...new Set((Array.isArray(list) ? list : []).filter((p) => p in PERMISSIONS))];

module.exports = {
  PERMISSIONS, STATUS_PERMISSION, hashPassword, verifyPassword, newToken, hashToken, cleanPermissions,
};
