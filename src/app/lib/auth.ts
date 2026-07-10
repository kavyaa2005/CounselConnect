// Token & user helpers — keeps storage access in one place.

const TOKEN_KEY = 'cc_token';
const USER_KEY  = 'cc_user';

export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

export const setUser = (user: any) => localStorage.setItem(USER_KEY, JSON.stringify(user));
export const getUser = (): any | null => {
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null'); } catch { return null; }
};
export const clearUser = () => localStorage.removeItem(USER_KEY);

export const isLoggedIn = () => !!getToken();

export const clearSession = () => {
  clearToken();
  clearUser();
};
