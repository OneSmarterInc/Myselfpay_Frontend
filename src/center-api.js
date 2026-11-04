import { beginLoading } from "./loading-state.js";
const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";
export async function centerAPI(action, data) {
  const endLoading = beginLoading();
  try {
    const response = await fetch(`${base}/center/${action}`, {
      method: data === undefined ? "GET" : "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json", "X-Center-CSRF": csrf },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      signal: AbortSignal.timeout(45000),
    });
    let value;
    try {
      value = await response.json();
    } catch {
      throw new Error("The center service is unavailable. Please try again.");
    }
    if (!response.ok) {
      const error = new Error(
        value.error || "Unable to complete this request.",
      );
      error.status = response.status;
      throw error;
    }
    if (value.center_csrf) csrf = value.center_csrf;
    if (action === "logout") csrf = "";
    return value;
  } finally {
    endLoading();
  }
}
