import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Navigate, useLocation } from "react-router";
import api, { USER_TOKEN } from "../lib/api";

const ShopContext = createContext(null);
const USER_KEY = "furnifor.user";

function storedUser() {
  try {
    return localStorage.getItem(USER_TOKEN) ? JSON.parse(localStorage.getItem(USER_KEY) || "null") : null;
  } catch {
    return null;
  }
}

/** Session, cart count and server settings for the shop side. */
export function ShopProvider({ children }) {
  const [user, setUser] = useState(storedUser);
  const [cart, setCart] = useState(null);
  const [config, setConfig] = useState({ googleClientId: null, shipping: "flat", couriers: [], paymentWindowHours: 24, bankAccount: "" });

  const saveSession = useCallback((token, nextUser) => {
    if (token) localStorage.setItem(USER_TOKEN, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_TOKEN);
    localStorage.removeItem(USER_KEY);
    setUser(null);
    setCart(null);
  }, []);

  const refreshCart = useCallback(async () => {
    if (!localStorage.getItem(USER_TOKEN)) return setCart(null);
    try {
      const { data } = await api.get("/cart");
      setCart(data.data);
    } catch {
      setCart(null);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      saveSession(null, data.data);
      return data.data;
    } catch {
      return null;
    }
  }, [saveSession]);

  // Load settings once, and keep the session fresh.
  useEffect(() => {
    api.get("/config").then(({ data }) => setConfig(data.data)).catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      refreshUser();
      refreshCart();
    }
    // Only on first load.
  }, []);
  useEffect(() => {
    const onExpired = () => logout();
    window.addEventListener("furnifor:logout", onExpired);
    return () => window.removeEventListener("furnifor:logout", onExpired);
  }, [logout]);

  const login = useCallback(
    async (identifier, password) => {
      const { data } = await api.post("/auth/login", { identifier, password });
      saveSession(data.token, data.user);
      refreshCart();
      return data.user;
    },
    [saveSession, refreshCart]
  );

  const loginWithGoogle = useCallback(
    async (credential) => {
      const { data } = await api.post("/auth/google", { credential });
      saveSession(data.token, data.user);
      refreshCart();
      return data;
    },
    [saveSession, refreshCart]
  );

  const register = useCallback(
    async (values) => {
      const { data } = await api.post("/auth/register", values);
      saveSession(data.token, data.user);
      return data;
    },
    [saveSession]
  );

  const value = useMemo(
    () => ({ user, cart, setCart, config, login, loginWithGoogle, register, logout, refreshUser, refreshCart, saveSession }),
    [user, cart, config, login, loginWithGoogle, register, logout, refreshUser, refreshCart, saveSession]
  );
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  return useContext(ShopContext);
}

/** Sends visitors to the login page and brings them back afterwards. */
export function RequireUser({ children }) {
  const { user } = useShop();
  const location = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return children;
}
