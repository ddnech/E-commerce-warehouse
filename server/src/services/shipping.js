const env = require("../config/env");
const { COURIERS } = require("../utils/constants");
const { distanceKm, hasCoords } = require("../utils/geo");

/*
 * Shipping costs.
 * With RAJAONGKIR_API_KEY set, prices come from RajaOngkir (now run by Komerce, rajaongkir.komerce.id).
 * Without a key, or if their API is down, a built-in table based on distance and weight is used,
 * so checkout always works.
 */

// ---------- built-in rates ----------

const SERVICES = {
  jne: [
    { service: "REG", description: "Regular", factor: 1 },
    { service: "YES", description: "Next day", factor: 1.9, express: true },
  ],
  pos: [
    { service: "Reguler", description: "Pos Reguler", factor: 0.9 },
    { service: "Nextday", description: "Pos Nextday", factor: 1.7, express: true },
  ],
  tiki: [
    { service: "REG", description: "Regular", factor: 1.05 },
    { service: "ONS", description: "Overnight", factor: 2, express: true },
  ],
};

function band(km) {
  if (km <= 30) return { base: 9000, perKg: 2000, etd: "1-2" };
  if (km <= 300) return { base: 14000, perKg: 4000, etd: "2-3" };
  if (km <= 1000) return { base: 22000, perKg: 7000, etd: "3-5" };
  return { base: 35000, perKg: 11000, etd: "4-7" };
}

function roughDistance(origin, destination) {
  if (hasCoords(origin) && hasCoords(destination)) {
    return distanceKm(origin.latitude, origin.longitude, destination.latitude, destination.longitude);
  }
  if (origin.city_id === destination.city_id) return 10;
  if (origin.province_id === destination.province_id) return 150;
  return 800;
}

function flatQuote(origin, destination, weightGrams) {
  const km = roughDistance(origin, destination);
  const kg = Math.max(1, Math.ceil(weightGrams / 1000));
  const { base, perKg, etd } = band(km);
  const round = (n) => Math.round(n / 500) * 500;

  return COURIERS.map(({ code, name }) => ({
    code,
    name,
    services: SERVICES[code].map((s) => ({
      service: s.service,
      description: s.description,
      cost: round((base + perKg * kg) * s.factor),
      etd: s.express ? (km <= 300 ? "1" : "1-2") : etd,
    })),
  }));
}

// ---------- RajaOngkir (Komerce) ----------

const destinationCache = new Map();

const cleanCityName = (name) => String(name).replace(/^(Kabupaten|Kota Administrasi|Kota)\s+/i, "").trim();

async function komerce(path, init = {}) {
  const res = await fetch(`${env.rajaongkirUrl}${path}`, {
    ...init,
    headers: { key: env.rajaongkirKey, ...(init.headers || {}) },
    signal: AbortSignal.timeout(8000),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body) throw new Error(body?.meta?.message || `RajaOngkir answered ${res.status}`);
  return body;
}

/** RajaOngkir has its own ids for places, so look them up by city name (and remember them). */
async function destinationId(cityName) {
  const key = cleanCityName(cityName).toLowerCase();
  if (destinationCache.has(key)) return destinationCache.get(key);
  const body = await komerce(`/destination/domestic-destination?search=${encodeURIComponent(cleanCityName(cityName))}&limit=5&offset=0`);
  const id = body?.data?.[0]?.id;
  if (!id) throw new Error(`RajaOngkir doesn't know "${cityName}"`);
  destinationCache.set(key, id);
  return id;
}

async function liveQuote(originCityName, destinationCityName, weightGrams) {
  const [origin, destination] = await Promise.all([destinationId(originCityName), destinationId(destinationCityName)]);
  const couriers = await Promise.all(
    COURIERS.map(async ({ code, name }) => {
      const body = await komerce("/calculate/domestic-cost", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ origin, destination, weight: String(Math.max(1, weightGrams)), courier: code }),
      });
      const services = (body.data || []).map((s) => ({
        service: s.service,
        description: s.description || s.service,
        cost: Number(s.cost) || 0,
        etd: String(s.etd || "").replace(/\s*(day|days|hari)\s*/i, ""),
      }));
      return { code, name, services: services.filter((s) => s.cost > 0) };
    })
  );
  return couriers.filter((c) => c.services.length);
}

/**
 * Shipping options from a warehouse to an address.
 * origin / destination: { city_id, province_id, latitude, longitude, cityName }
 * Returns { mode: "live" | "flat", couriers: [{ code, name, services: [{ service, description, cost, etd }] }] }
 */
async function quote(origin, destination, weightGrams) {
  if (env.rajaongkirKey) {
    try {
      const couriers = await liveQuote(origin.cityName, destination.cityName, weightGrams);
      if (couriers.length) return { mode: "live", couriers };
    } catch (error) {
      console.warn(`[shipping] RajaOngkir failed, using built-in rates: ${error.message}`);
    }
  }
  return { mode: "flat", couriers: flatQuote(origin, destination, weightGrams) };
}

module.exports = { quote, flatQuote };
