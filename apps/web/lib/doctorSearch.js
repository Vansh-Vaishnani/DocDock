function buildDoctorSearchParams(filters = {}) {
  const params = new URLSearchParams();

  const {
    latitude,
    longitude,
    specialization,
    minExperience,
    maxFee,
    search,
    sortBy,
    radius,
    page,
    limit,
    availableOnly
  } = filters;

  if (typeof latitude === 'number' && !Number.isNaN(latitude)) {
    params.set('latitude', String(latitude));
  }
  if (typeof longitude === 'number' && !Number.isNaN(longitude)) {
    params.set('longitude', String(longitude));
  }
  if (specialization) {
    params.set('specialization', specialization);
  }
  if (typeof minExperience === 'number' && !Number.isNaN(minExperience)) {
    params.set('minExperience', String(minExperience));
  }
  if (typeof maxFee === 'number' && !Number.isNaN(maxFee)) {
    params.set('maxFee', String(maxFee));
  }
  if (search) {
    params.set('search', search);
  }
  if (sortBy) {
    params.set('sortBy', sortBy);
  }
  if (typeof radius === 'number' && !Number.isNaN(radius)) {
    params.set('radius', String(radius));
  }
  if (typeof page === 'number' && page > 0) {
    params.set('page', String(page));
  }
  if (typeof limit === 'number' && limit > 0) {
    params.set('limit', String(limit));
  }
  if (availableOnly) {
    params.set('availableOnly', 'true');
  }

  return params;
}

module.exports = {
  buildDoctorSearchParams
};
