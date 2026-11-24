import { useEffect, useState } from "react";
import { api } from "./api.js";
export function useResource(path, refresh = 0) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  useEffect(() => {
    if (!path) {
      setState({ data: null, error: "", loading: false });
      return;
    }
    const controller = new AbortController();
    setState({ data: null, error: "", loading: true });
    api(path, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ data, error: "", loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ data: null, error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [path, refresh]);
  return state;
}
