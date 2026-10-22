import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

let cache = null;

/** All warehouses, for filter dropdowns. Cached until clearWarehouseCache(). */
export function useWarehouses() {
  const [list, setList] = useState(cache || []);
  useEffect(() => {
    if (cache) return;
    adminApi.get("/admin/warehouses").then(({ data }) => {
      cache = data.data.map((w) => ({ id: w.id, name: w.warehouse_name }));
      setList(cache);
    });
  }, []);
  return list;
}

export function clearWarehouseCache() {
  cache = null;
}
