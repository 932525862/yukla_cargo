'use strict';

const PREFIX = 'YK';

/** ID raqami 5 xonali, 70 dan boshlanadi; birinchi ID: YK7010101 */
const FIRST_NUMBER = 70100;

/** Raqamlar ichida ikkita bir xil raqam yonma-yon kelsa true (11, 77, 155 ...). */
function hasAdjacentRepeat(n) {
  const s = String(n);
  for (let i = 1; i < s.length; i++) {
    if (s[i] === s[i - 1]) return true;
  }
  return false;
}

/** `after` dan katta, yonma-yon bir xil raqamsiz eng kichik son. */
function nextValidNumber(after) {
  let n = after + 1;
  while (hasAdjacentRepeat(n)) n++;
  return n;
}

/** 70101 -> YK7010101 */
function formatClientId(n) {
  return `${PREFIX}${n}`;
}

module.exports = { PREFIX, FIRST_NUMBER, hasAdjacentRepeat, nextValidNumber, formatClientId };
