// Central API client — all requests go through here.
// Automatically injects the JWT token from localStorage.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const getToken = (): string | null => localStorage.getItem('cc_token');

const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message: string; data: T }> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // A non-JSON body (an HTML error page, a proxy timeout, the dev server
  // returning index.html) used to blow up on res.json() with an opaque
  // "Unexpected token <" — surface what actually came back instead.
  const raw = await res.text();
  let json: any = null;
  try { json = raw ? JSON.parse(raw) : {}; } catch {
    throw Object.assign(
      new Error(
        res.ok
          ? `Server sent a non-JSON response (${res.status}) for ${endpoint}`
          : `${res.status} ${res.statusText || 'Request failed'} — ${endpoint}`
      ),
      { status: res.status, body: raw.slice(0, 200) }
    );
  }

  if (!res.ok) {
    throw Object.assign(new Error(json.message || `${res.status} ${res.statusText || 'Request failed'}`), {
      status: res.status,
      errors: json.errors,
    });
  }
  return json;
};

// Convenience helpers
export const api = {
  get: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  put: <T = any>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T = any>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  upload: <T = any>(endpoint: string, formData: FormData) => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return request<T>(endpoint, { method: 'POST', body: formData, headers } as any);
  },

  /**
   * Downloads a file from a protected endpoint.
   *
   * A plain <a href> or window.open can't carry the Authorization header, so
   * these routes would 401. Fetching as a blob and clicking a temporary
   * object URL is the only way to authenticate a download from the browser.
   *
   * @param open  true = preview in a new tab, false = save to disk
   */
  download: async (endpoint: string, filename?: string, open = false) => {
    const token = getToken();
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      // Errors still come back as JSON even on a file route
      let msg = 'Download failed';
      try { msg = (await res.json()).message || msg; } catch { /* not json */ }
      throw new Error(msg);
    }

    // Prefer the server's filename when it sent one
    const cd = res.headers.get('content-disposition') || '';
    const match = /filename="?([^";]+)"?/.exec(cd);
    const name = filename || (match ? match[1] : 'download');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    if (open) {
      window.open(url, '_blank', 'noopener');
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    // Revoke late — Safari cancels an in-flight download if you revoke at once.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return name;
  },
};

export default api;
