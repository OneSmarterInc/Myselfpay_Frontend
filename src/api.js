const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");
let csrf = "";
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
      ...(data === undefined ? {} : { "Content-Type": "application/json" }),
      ...(csrf ? { "X-CSRF-Token": csrf } : {}),
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(
      "The server returned an unreadable response. Please retry.",
    );
  }
  if (!response.ok) {
    const error = new Error(body.error || "Request failed. Please retry.");
    error.status = response.status;
    error.details = body;
    throw error;
  }
  if (body.csrf) setCsrf(body.csrf);
  return body;
}
