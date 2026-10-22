import { useEffect, useState } from "react";
import { adminApi } from "../../lib/api";

/** id + name of every product, for dropdowns. */
export function useProductOptions() {
  const [list, setList] = useState([]);
  useEffect(() => {
    adminApi.get("/admin/products/options").then(({ data }) => setList(data.data)).catch(() => {});
  }, []);
  return list;
}
