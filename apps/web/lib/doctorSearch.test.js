const test = require('node:test');
const assert = require('node:assert/strict');

const { buildDoctorSearchParams } = require('./doctorSearch');

test('buildDoctorSearchParams includes filters and pagination', () => {
  const params = buildDoctorSearchParams({
    latitude: 12.9716,
    longitude: 77.5946,
    specialization: 'Cardiology',
    maxFee: 1000,
    minExperience: 5,
    search: 'Dr. Rao',
    sortBy: 'rating',
    page: 2,
    limit: 6,
    radius: 15000
  });

  assert.equal(params.get('latitude'), '12.9716');
  assert.equal(params.get('longitude'), '77.5946');
  assert.equal(params.get('specialization'), 'Cardiology');
  assert.equal(params.get('maxFee'), '1000');
  assert.equal(params.get('minExperience'), '5');
  assert.equal(params.get('search'), 'Dr. Rao');
  assert.equal(params.get('sortBy'), 'rating');
  assert.equal(params.get('page'), '2');
  assert.equal(params.get('limit'), '6');
  assert.equal(params.get('radius'), '15000');
});
