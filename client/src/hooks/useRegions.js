import { useEffect, useState } from "react";
import api from "../lib/api";

let provinceCache = null;
const cityCache = new Map();

/** Provinces, plus the cities of the selected province. */
export function useRegions(provinceId) {
  const [provinces, setProvinces] = useState(provinceCache || []);
  const [cities, setCities] = useState(cityCache.get(String(provinceId)) || []);

  useEffect(() => {
    if (provinceCache) return;
    api.get("/regions/provinces").then(({ data }) => {
      provinceCache = data.data;
      setProvinces(data.data);
    });
  }, []);

  useEffect(() => {
    if (!provinceId) return setCities([]);
    const key = String(provinceId);
    if (cityCache.has(key)) return setCities(cityCache.get(key));
    let cancelled = false;
    api.get("/regions/cities", { params: { province: provinceId } }).then(({ data }) => {
      cityCache.set(key, data.data);
      if (!cancelled) setCities(data.data);
    });
    return () => {
      cancelled = true;
    };
  }, [provinceId]);

  return { provinces, cities };
}
