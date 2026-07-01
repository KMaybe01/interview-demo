import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TokenRefresh from '../TokenRefresh.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    post: vi.fn().mockResolvedValue({
      status: 200,
      data: { access_token: 'mock-access', refresh_token: 'mock-refresh', rotation: true },
    }),
    get: vi.fn().mockResolvedValue({ data: { remaining: 50 } }),
  },
  getErrorMessage: vi.fn(),
}));

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
    removeItem: (k: string) => {
      delete store[k];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeEach(() => {
  localStorageMock.clear();
});

describe('TokenRefresh', () => {
  it('renders login button when not logged in', () => {
    render(<TokenRefresh />);
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('renders action buttons after login', async () => {
    const user = userEvent.setup();
    render(<TokenRefresh />);
    await user.click(screen.getByRole('button', { name: /登录/i }));
    expect(await screen.findByText(/已登录/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /模拟请求/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /强制过期/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /手动刷新/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /并发 3 请求/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /退出/i })).toBeInTheDocument();
  });

  it('shows alert status after login', async () => {
    const user = userEvent.setup();
    render(<TokenRefresh />);
    await user.click(screen.getByRole('button', { name: /登录/i }));
    expect(await screen.findByText(/就绪/)).toBeInTheDocument();
  });

  it('logout clears logged in state', async () => {
    const user = userEvent.setup();
    render(<TokenRefresh />);
    await user.click(screen.getByRole('button', { name: /登录/i }));
    await screen.findByText(/已登录/);
    await user.click(screen.getByRole('button', { name: /退出/i }));
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument();
  });

  it('shows Token information section after login', async () => {
    const user = userEvent.setup();
    render(<TokenRefresh />);
    await user.click(screen.getByRole('button', { name: /登录/i }));
    expect(await screen.findByText(/Token 信息/)).toBeInTheDocument();
    expect(await screen.findByText(/Token 生命周期/)).toBeInTheDocument();
    expect(await screen.findByText(/操作日志/)).toBeInTheDocument();
  });

  it('shows custom token on expire button click', async () => {
    const user = userEvent.setup();
    localStorageMock.setItem(
      'access_token',
      'header.' +
        btoa(JSON.stringify({ sub: 'admin', exp: 9999999999, iat: 1000000000, role: 'ADMIN' })) +
        '.sig',
    );
    localStorageMock.setItem('refresh_token', 'refresh-token');
    render(<TokenRefresh />);
    await user.click(screen.getByRole('button', { name: /登录/i }));
    await screen.findByText(/已登录/);
    await user.click(screen.getByRole('button', { name: /强制过期/i }));
  });
});
