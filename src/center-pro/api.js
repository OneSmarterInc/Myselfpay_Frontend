let csrf = "", centerCsrf = "";
const base = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "") + "/center-pro";
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
export async function api(path, { method = "GET", body, signal, _csrfRetry = false } = {}) {
  if(method!=="GET"&&!/^(?:[A-Za-z0-9]{32}|[A-Za-z0-9]{64})$/.test(csrf))await api("/session",{signal});
  const hash=location.hash;
  if(/^#center-pro\/admin-(?!login)/.test(hash))sessionStorage.setItem('center-pro-mode','admin');
  if(hash==='#center'||/^#center-pro\/(sign-in|verify\/)/.test(hash))sessionStorage.setItem('center-pro-mode','center');
  const mode=sessionStorage.getItem('center-pro-mode')||'center';
  const target=new URL(base+path,location.origin);target.searchParams.set('workspace',mode);
  const response = await fetch(target.href, {
    method,
    credentials: "include",
    cache: "no-store",
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
      : AbortSignal.timeout(30000),
    headers: {
      "Content-Type": "application/json",
      ...(method !== "GET" ? { "X-CSRFToken": csrf, "X-Center-CSRF": centerCsrf } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "The service is unavailable. Please try again.",
      response.status,
    );
  }
  if(response.status===403&&data.code==='csrf_failed'&&method!=='GET'&&!_csrfRetry){
    await api('/session',{signal});
    return api(path,{method,body,signal,_csrfRetry:true});
  }
  if (
    (response.status === 401 || response.status === 403) &&
    (data.detail || data.error) === "Authentication credentials were not provided."
  ) {
    window.dispatchEvent(new Event("pro-session-expired"));
  }
  if (!response.ok)
    throw new ApiError(
      validationMessage(data.details || data),
      response.status,
    );
  if (data.csrf_token) csrf = data.csrf_token;
  if (data.center_csrf) centerCsrf = data.center_csrf;
  return data;
}
export function requestQuery({
  search = "",
  status = "",
  page = 1,
  size = 5,
  order = "-created_at",
}) {
  return (
    "?" +
    new URLSearchParams({
      search,
      status,
      page: String(page),
      page_size: String(size),
      ordering: order,
    })
  );
}

export function validationMessage(data) {
  const names = {preferred_times: "Preferred times", preferred_slot_ids: "Preferred times", patient_name: "Patient name", starts_at: "Start time", ends_at: "End time", expected_version: "Price version", offer_id: "Exam offer"};
  function flatten(value, path = "") {
    if (Array.isArray(value)) return value.flatMap((item, index) => flatten(item, typeof item === "object" && item !== null ? `${path ? path + ": " : ""}Row ${index + 1}` : path));
    if (value && typeof value === "object") return Object.entries(value).flatMap(([key, item]) => flatten(item, [path, ["detail", "non_field_errors"].includes(key) ? "" : names[key] || key.replaceAll("_", " ")].filter(Boolean).join(": ")));
    return typeof value === "string" ? [path ? `${path}: ${value}` : value] : [];
  }
  return flatten(data).join("; ") || "Unable to complete this request.";
}

export function ownerPortalCsrf(){ return csrf; }
