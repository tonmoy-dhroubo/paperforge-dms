export type AuthTokens = {
  token: string;
  refreshToken: string;
};

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  roles: string[];
};

const TOKEN_KEY = 'paperforge.token';
const REFRESH_KEY = 'paperforge.refreshToken';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(REFRESH_KEY);
}

export function setTokens(tokens: AuthTokens) {
  window.localStorage.setItem(TOKEN_KEY, tokens.token);
  window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_KEY);
}

