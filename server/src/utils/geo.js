/** Distance between two points on Earth in km (haversine). */
function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

const hasCoords = (place) =>
  place && place.latitude !== null && place.latitude !== undefined && place.latitude !== "" &&
  place.longitude !== null && place.longitude !== undefined && place.longitude !== "";

/**
 * Sorts warehouses from nearest to furthest for an address.
 * Uses coordinates when both sides have them, otherwise same city first, then same province.
 * Returns [{ warehouse, distanceKm }].
 */
function sortByDistance(warehouses, target) {
  const score = (w) => {
    if (hasCoords(w) && hasCoords(target)) return distanceKm(w.latitude, w.longitude, target.latitude, target.longitude);
    if (w.city_id && w.city_id === target.city_id) return 0;
    if (w.province_id && w.province_id === target.province_id) return 500;
    return 5000;
  };
  return warehouses
    .map((warehouse) => ({ warehouse, distanceKm: Math.round(score(warehouse)) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

module.exports = { distanceKm, sortByDistance, hasCoords };
