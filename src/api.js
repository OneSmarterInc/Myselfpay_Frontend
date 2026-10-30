const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";

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
        body.error ||
        body.detail ||
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
  csrf = value || "";
}
export async function api(
  path,
  data,
  method = data === undefined ? "GET" : "POST",
) {
  const response = await fetch(base + path, {
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
    throw new APIError(body, response);
  }
  if (body.csrf) setCsrf(body.csrf);
  return body;
}
