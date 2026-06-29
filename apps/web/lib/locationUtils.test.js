const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDistanceKm, formatDistanceKm } = require('./locationUtils.js');

test('calculateDistanceKm returns a finite value for nearby coordinates', () => {
  const distance = calculateDistanceKm(12.9716, 77.5946, 12.9720, 77.5950);
  assert.ok(Number.isFinite(distance));
  assert.ok(distance > 0);
});

test('formatDistanceKm returns a readable string without NaN', () => {
  assert.equal(formatDistanceKm(0), '0.0 km');
  assert.equal(formatDistanceKm(1234), '1.2 km');
});
