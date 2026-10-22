import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Small data loader: runs `load()` on mount and whenever `deps` change.
 * Returns { data, error, loading, reload, setData }.
 */
export function useFetch(load, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const latest = useRef(0);

  const run = useCallback(load, deps);

  const reload = useCallback(async () => {
    const id = ++latest.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await run();
      if (id === latest.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === latest.current) setState((s) => ({ ...s, error, loading: false }));
      return null;
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === "function" ? updater(s.data) : updater })), []);
  return { ...state, reload, setData };
}
