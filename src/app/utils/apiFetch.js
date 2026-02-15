import Cookies from "js-cookie";

/**
 * Wrapper around fetch for /api/proxy calls with automatic auth headers.
 * @param {string} path - The proxy path (e.g. "/api/proxy/oeuvres")
 * @param {RequestInit} [options={}] - Standard fetch options
 * @returns {Promise<{ok: boolean, data: any, status: number}>}
 */
export async function apiFetch(path, options = {}) {
  const jwt = Cookies.get("jwt");
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    ...options.headers,
  };

  const res = await fetch(path, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // response may be empty (204 No Content)
  }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return { ok: true, data, status: res.status };
}
