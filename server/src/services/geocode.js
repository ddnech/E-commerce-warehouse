const env = require("../config/env");

/**
 * Coordinates for an address.
 * With OPENCAGE_API_KEY set, the street address is looked up. Otherwise (or if that fails)
 * the city's own coordinates are used, which is close enough to pick the nearest warehouse.
 */
async function coordinatesFor({ address, city, province }) {
  if (env.opencageKey && address) {
    try {
      const q = [address, city?.name, province?.name, "Indonesia"].filter(Boolean).join(", ");
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(q)}&key=${env.opencageKey}&countrycode=id&limit=1&no_annotations=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
      const body = await res.json();
      const point = body?.results?.[0]?.geometry;
      if (point) return { latitude: String(point.lat), longitude: String(point.lng), source: "opencage" };
    } catch (error) {
      console.warn(`[geocode] OpenCage failed, using the city's coordinates: ${error.message}`);
    }
  }
  if (city?.latitude != null && city?.longitude != null) {
    return { latitude: String(city.latitude), longitude: String(city.longitude), source: "city" };
  }
  return { latitude: "0", longitude: "0", source: "none" };
}

module.exports = { coordinatesFor };
