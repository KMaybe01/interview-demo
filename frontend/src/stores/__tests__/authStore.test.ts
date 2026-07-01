import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '../authStore.ts';

beforeEach(() => {
  useAuthStore.setState({ user: null, isLoggedIn: false });
});

describe('authStore', () => {
  it('starts logged out', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('login sets user and isLoggedIn', () => {
    const user = { sub: 'admin', role: 'ADMIN' };
    useAuthStore.getState().login(user);
    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.isLoggedIn).toBe(true);
  });

  it('logout clears user and isLoggedIn', () => {
    useAuthStore.getState().login({ sub: 'admin', role: 'ADMIN' });
    useAuthStore.getState().logout();
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.isLoggedIn).toBe(false);
  });

  it('setUser sets null when called with null', () => {
    useAuthStore.getState().login({ sub: 'admin', role: 'ADMIN' });
    useAuthStore.getState().setUser(null);
    expect(useAuthStore.getState().isLoggedIn).toBe(false);
  });

  it('setUser sets user and isLoggedIn when called with user', () => {
    const user = { sub: 'test', role: 'EDITOR' };
    useAuthStore.getState().setUser(user);
    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().isLoggedIn).toBe(true);
  });
});
