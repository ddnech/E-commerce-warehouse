import { useEffect, useState } from "react";
import api from "../lib/api";

// Categories rarely change, so share one request across the app.
let cache = null;

export function useCategories() {
  const [categories, setCategories] = useState(cache?.data || []);
  useEffect(() => {
    if (!cache) cache = { promise: api.get("/categories").then(({ data }) => (cache.data = data.data)) };
    cache.promise.then(setCategories).catch(() => {
      cache = null;
    });
  }, []);
  return categories;
}

export function clearCategoryCache() {
  cache = null;
}
