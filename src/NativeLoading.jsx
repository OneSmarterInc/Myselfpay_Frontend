import { useEffect, useState, useSyncExternalStore } from "react";
import { loadingCount, subscribeLoading } from "./loading-state.js";
export default function NativeLoading({ waiting = false }) {
  const count = useSyncExternalStore(subscribeLoading, loadingCount, () => 0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!count && !waiting) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 180);
    return () => clearTimeout(timer);
  }, [count > 0, waiting]);
  return visible ? (
    <div className="native-loading" role="status" aria-live="polite">
      <span className="native-loading-ring" aria-hidden="true" />
      <span>
        {waiting ? "Finding nearby centers…" : "Loading, please wait…"}
      </span>
    </div>
  ) : null;
}
