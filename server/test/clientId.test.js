'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { hasAdjacentRepeat, nextValidNumber, formatClientId, FIRST_NUMBER } = require('../src/clientId');

test('ID lar YK70 dan boshlanadi, 5 xonali, yonma-yon bir xil raqamsiz', () => {
  let n = FIRST_NUMBER;
  const ids = [];
  for (let i = 0; i < 500; i++) { n = nextValidNumber(n); ids.push(formatClientId(n)); }
  assert.deepStrictEqual(ids.slice(0, 11),
    ['YK70101','YK70102','YK70103','YK70104','YK70105','YK70106','YK70107','YK70108','YK70109','YK70120','YK70121']);
  for (const id of ids) {
    assert.match(id, /^YK70\d{3}$/);
    assert.ok(!hasAdjacentRepeat(id.slice(2)), id);
  }
});

test('takrorlanuvchi raqamlar aniqlanadi', () => {
  for (const bad of [70110, 70133, 70144, 70100, 70155]) assert.ok(hasAdjacentRepeat(bad), String(bad));
});
