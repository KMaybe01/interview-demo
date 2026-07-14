import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import WebWorkerMerge from '../WebWorkerMerge.tsx';

describe('WebWorkerMerge', () => {
  it('renders run button with default data size', () => {
    render(<WebWorkerMerge />);
    expect(screen.getByRole('button', { name: /运行/i })).toBeInTheDocument();
  });

  it('renders reset button', () => {
    render(<WebWorkerMerge />);
    expect(screen.getByRole('button', { name: /重置/i })).toBeInTheDocument();
  });

  it('renders data size selector', () => {
    render(<WebWorkerMerge />);
    expect(screen.getByText(/数据量/)).toBeInTheDocument();
  });

  it('shows worker pool info', () => {
    render(<WebWorkerMerge />);
    expect(screen.getByText(/Worker Pool/)).toBeInTheDocument();
  });

  it('allows changing data size', async () => {
    const user = userEvent.setup();
    render(<WebWorkerMerge />);
    const select = document.querySelector('.ant-select');
    if (!select) throw new Error('select not found');
    await user.click(select);
    const option = await screen.findByText('10万');
    await user.click(option);
  });
});
