// Labels and session helpers for the single account menu in the site header.
export const CENTER_SESSION_KEY = "msp-center-session";

export function memberLabel(account) {
  const name = String(account?.name || "").trim();
  const digits = String(account?.phone || "").replace(/\D/g, "");
  const initial = /^[A-Za-z]/.test(name) ? name[0].toUpperCase() : "";
  const number = digits.length >= 4 ? digits.slice(-4) : "";
  return { initial: initial || "A", text: [initial, number].filter(Boolean).join(" · ") || "Account" };
}

export function readCenterSession() {
  try {
    const value = JSON.parse(localStorage.getItem(CENTER_SESSION_KEY) || "null");
    return value && typeof value.name === "string" ? value : null;
  } catch {
    return null;
  }
}

export function writeCenterSession(value) {
  try {
    if (value) localStorage.setItem(CENTER_SESSION_KEY, JSON.stringify({ name: String(value.name || "Center") }));
    else localStorage.removeItem(CENTER_SESSION_KEY);
  } catch {
    /* storage can be unavailable; the menu then shows only while the workspace is open */
  }
  window.dispatchEvent(new Event("msp-center-session"));
}
