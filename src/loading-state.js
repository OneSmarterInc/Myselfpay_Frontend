let pending = 0;
const listeners = new Set();
export const subscribeLoading = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
export const loadingCount = () => pending;
export function beginLoading() {
  pending++;
  listeners.forEach((listener) => listener());
  let finished = false;
  return () => {
    if (finished) return;
    finished = true;
    pending = Math.max(0, pending - 1);
    listeners.forEach((listener) => listener());
  };
}
