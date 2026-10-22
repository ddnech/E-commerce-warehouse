import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router";
import { adminApi, ADMIN_TOKEN } from "../lib/api";

const AdminContext = createContext(null);
const ADMIN_KEY = "furnifor.admin";

function storedAdmin() {
  try {
    return localStorage.getItem(ADMIN_TOKEN) ? JSON.parse(localStorage.getItem(ADMIN_KEY) || "null") : null;
  } catch {
    return null;
  }
}

export function AdminProvider({ children }) {
  const [admin, setAdmin] = useState(storedAdmin);

  const login = useCallback(async (username, password) => {
    const { data } = await adminApi.post("/admin/auth/login", { username, password });
    localStorage.setItem(ADMIN_TOKEN, data.token);
    localStorage.setItem(ADMIN_KEY, JSON.stringify(data.admin));
    setAdmin(data.admin);
    return data.admin;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(ADMIN_TOKEN);
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(null);
  }, []);

  // Pick up changes (like a new warehouse assignment) made since the last login.
  useEffect(() => {
    if (!admin) return;
    adminApi
      .get("/admin/auth/me")
      .then(({ data }) => {
        localStorage.setItem(ADMIN_KEY, JSON.stringify(data.data));
        setAdmin(data.data);
      })
      .catch(() => {});
  }, []);

  const value = useMemo(() => ({ admin, isSuper: admin?.role === "super", login, logout }), [admin, login, logout]);
  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}

export function RequireAdmin({ superOnly = false, children }) {
  const { admin } = useAdmin();
  if (!admin) return <Navigate to="/admin/login" replace />;
  if (superOnly && admin.role !== "super") return <Navigate to="/admin" replace />;
  return children;
}
