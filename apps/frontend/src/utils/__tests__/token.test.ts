import {clearTokens, getAccessToken, getRefreshToken, isTokenExpired, parseToken, setTokens,} from '../token.ts';

beforeEach(() => {
  localStorage.clear();
});

describe('token', () => {
  it('returns null when no tokens are stored', () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it('stores and retrieves tokens', () => {
    setTokens('access-123', 'refresh-456');
    expect(getAccessToken()).toBe('access-123');
    expect(getRefreshToken()).toBe('refresh-456');
  });

  it('clears tokens', () => {
    setTokens('access', 'refresh');
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });
});

describe('parseToken', () => {
  function encodePayload(payload: Record<string, unknown>): string {
    const b64 = btoa(JSON.stringify(payload));
    return `header.${b64}.signature`;
  }

  it('parses a valid JWT token', () => {
    const token = encodePayload({ sub: 'admin', exp: 9999999999, iat: 1000000000, role: 'ADMIN' });
    const result = parseToken(token);
    expect(result).toEqual({ sub: 'admin', exp: 9999999999, iat: 1000000000, role: 'ADMIN' });
  });

  it('returns null for malformed token', () => {
    expect(parseToken('not-a-jwt')).toBeNull();
    expect(parseToken('a.b.c')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseToken('')).toBeNull();
  });
});

describe('isTokenExpired', () => {
  function makeToken(exp: number): string {
    const b64 = btoa(JSON.stringify({ sub: 'user', exp, iat: 1000000000, role: 'USER' }));
    return `header.${b64}.sig`;
  }

  it('returns true for expired token', () => {
    const token = makeToken(Date.now() / 1000 - 60);
    expect(isTokenExpired(token)).toBe(true);
  });

  it('returns false for valid token', () => {
    const token = makeToken(Date.now() / 1000 + 3600);
    expect(isTokenExpired(token)).toBe(false);
  });

  it('returns true for malformed token', () => {
    expect(isTokenExpired('bad')).toBe(true);
  });

  it('respects bufferMs option', () => {
    const token = makeToken(Date.now() / 1000 + 10);
    expect(isTokenExpired(token, 15000)).toBe(true);
    expect(isTokenExpired(token, 5000)).toBe(false);
  });
});
