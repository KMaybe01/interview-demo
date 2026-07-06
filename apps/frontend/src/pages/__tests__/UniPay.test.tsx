import { render, screen } from '@testing-library/react';
import { App as AntApp } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import UniPay from '../UniPay.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    post: vi.fn().mockResolvedValue({
      data: {
        paymentId: 'pay_123',
        status: 'pending',
        stateMachine: { current: 'pending', allowed: ['processing', 'failed'] },
      },
    }),
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
  getErrorMessage: vi.fn(),
}));

function renderPage() {
  return render(
    <AntApp>
      <UniPay />
    </AntApp>,
  );
}

describe('UniPay', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText(/统一支付中台演示/)).toBeInTheDocument();
  });

  it('shows payment form', () => {
    renderPage();
    expect(screen.queryAllByText(/创建支付订单/).length).toBeGreaterThan(0);
  });
});
