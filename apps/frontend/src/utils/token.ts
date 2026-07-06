const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function parseToken(
  token: string,
): { sub: string; exp: number; iat: number; role: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      sub: string;
      exp: number;
      iat: number;
      role: string;
    };
    return payload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, bufferMs = 30_000): boolean {
  const payload = parseToken(token);
  return payload == null || payload.exp * 1000 < Date.now() + bufferMs;
}
