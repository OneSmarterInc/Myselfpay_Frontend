const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";
let sessionVersion = 0;

function validationMessages(value, field = "") {
  if (typeof value === "string") {
    const label = field.replaceAll("_", " ");
    return [label ? `${label}: ${value}` : value];
  }
  if (Array.isArray(value))
    return value.flatMap((item) => validationMessages(item, field));
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, item]) =>
      validationMessages(
        item,
        key === "non_field_errors" ? field : field ? `${field}.${key}` : key,
      ),
    );
  }
  return [];
}

export class APIError extends Error {
  constructor(body, response) {
    const fields = body.details || (body.error || body.detail ? {} : body);
    const messages = validationMessages(fields);
    super(
      messages.join(" ") ||
        validationMessages(body.error).join(" ") ||
        validationMessages(body.detail).join(" ") ||
        "Request failed. Please retry.",
    );
    this.name = "APIError";
    this.status = response.status;
    this.details = body;
    this.fieldErrors = fields;
    this.code = body.code;
    const retry = response.headers.get("Retry-After") || body.retry_after;
    this.retryAfter = Number.isFinite(Number(retry)) ? Number(retry) : 0;
  }
}

export function setCsrf(value) {
  if (csrf !== (value || "")) sessionVersion++;
  csrf = value || "";
}

export async function establishSession(path, data) {
  await api(path, data);
  // A successful login response alone does not prove that the browser accepted
  // its HttpOnly cookie. Check it before showing authenticated screens.
  try {
    return await api("/me");
  } catch (error) {
    if (error.status !== 401) throw error;
    setCsrf("");
    throw new Error(
      "Your browser could not keep your session. Reload this page and try again.",
    );
  }
}
export async function api(
  path,
  data,
  method = data === undefined ? "GET" : "POST",
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    return await request(path, data, method, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(
        "The server took too long to respond. Delivery is not confirmed. Check your inbox or request status before trying again.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function request(
  path,
  data,
  method = data === undefined ? "GET" : "POST",
  signal,
) {
  const requestSessionVersion = sessionVersion;
  const response = await fetch(base + path, {
    signal,
    method,
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  if (response.status === 204) return null;
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "The server returned an unreadable response. Please retry.",
    );
  }
  if (!response.ok) {
    const publicSessionPaths = ["/me", "/guest", "/login", "/register"];
    if (
      response.status === 401 &&
      !publicSessionPaths.includes(path) &&
      !path.startsWith("/booking/") &&
      requestSessionVersion === sessionVersion
    ) {
      setCsrf("");
      globalThis.dispatchEvent?.(new Event("selfpay:session-expired"));
    }
    throw new APIError(body, response);
  }
  if (body.csrf) setCsrf(body.csrf);
  return body;
}
