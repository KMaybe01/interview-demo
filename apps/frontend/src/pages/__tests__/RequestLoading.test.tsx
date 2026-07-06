import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRequestLoadingStore } from '../../stores/requestLoadingStore.ts';
import RequestLoading from '../RequestLoading.tsx';

vi.mock('../../utils/requestResource.ts', () => ({
  createRequestResource: vi.fn(() => ({
    key: 'mock',
    method: 'GET',
    path: '/api/test',
    delay: 100,
    startTime: performance.now(),
    promise: Promise.resolve({ success: true, data: { mock: true } }),
    abort: vi.fn(),
  })),
}));

beforeEach(() => {
  useRequestLoadingStore.setState({ requests: [] });
});

describe('RequestLoading', () => {
  it('renders action buttons for each request type', () => {
    render(<RequestLoading />);
    expect(screen.getByText(/GET \/api\/users/)).toBeInTheDocument();
    expect(screen.getByText(/POST \/api\/users/)).toBeInTheDocument();
    expect(screen.getByText(/DELETE \/api\/users\/1/)).toBeInTheDocument();
  });

  it('shows empty state initially', () => {
    render(<RequestLoading />);
    expect(screen.getByText(/暂无请求/)).toBeInTheDocument();
  });

  it('has clear completed and all request buttons', () => {
    render(<RequestLoading />);
    expect(screen.getByRole('button', { name: /清除已完成/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /全部请求/i })).toBeInTheDocument();
  });

  it('starts a request on button click', async () => {
    const user = userEvent.setup();
    render(<RequestLoading />);
    await user.click(screen.getByText(/GET \/api\/users/));
    expect(useRequestLoadingStore.getState().requests.length).toBe(1);
  });

  it('all batch request button starts all requests', async () => {
    const user = userEvent.setup();
    render(<RequestLoading />);
    await user.click(screen.getByRole('button', { name: /全部请求/i }));
    expect(useRequestLoadingStore.getState().requests.length).toBe(6);
  });
});
