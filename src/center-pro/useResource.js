import { useCallback, useEffect, useState } from "react";
import { api } from "./api.js";
export function useResource(path, refresh = 0) {
  const [state, setState] = useState({ path, data: null, error: "", loading: true });
  useEffect(() => {
    if (!path) {
      setState({ path, data: null, error: "", loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ path, data: null, error: "", loading: true });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ path, data, error: "", loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ path, data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, refresh]);
  // Apply a successful server response without an extra GET. Never cross routes.
  const replaceData = useCallback((data) => {
    setState(current => current.path === path ? {path, data, error: "", loading: false} : current);
  }, [path]);
  return {...(state.path === path ? state : {path, data: null, error: "", loading: Boolean(path)}), replaceData};
}
