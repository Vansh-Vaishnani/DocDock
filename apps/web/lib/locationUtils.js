function toRad(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const radius = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return radius * c;
}

function formatDistanceKm(distanceMetersOrKm, fromMeters = true) {
  const numeric = Number(distanceMetersOrKm);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0.0 km';

  if (fromMeters) {
    if (numeric < 1000) return `${Math.round(numeric)} m`;
    return `${(numeric / 1000).toFixed(1)} km`;
  }

  if (numeric < 1) return `${Math.round(numeric * 1000)} m`;
  return `${numeric.toFixed(1)} km`;
}

module.exports = {
  calculateDistanceKm,
  formatDistanceKm
};
