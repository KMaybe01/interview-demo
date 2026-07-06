import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import SseLogStream from '../SseLogStream.tsx';

describe('SseLogStream', () => {
  it('renders connection status', () => {
    render(<SseLogStream />);
    expect(screen.getByText(/未连接/)).toBeInTheDocument();
  });

  it('renders controls', () => {
    render(<SseLogStream />);
    expect(screen.getByText(/暂停/)).toBeInTheDocument();
    expect(screen.getByText(/清空/)).toBeInTheDocument();
    expect(screen.getByText(/间隔/)).toBeInTheDocument();
  });

  it('shows 0 logs initially', () => {
    render(<SseLogStream />);
    expect(screen.getByText(/0 条/)).toBeInTheDocument();
  });

  it('pause button toggles state', async () => {
    const user = userEvent.setup();
    render(<SseLogStream />);
    await user.click(screen.getByText(/暂停/));
    expect(screen.getAllByText(/已暂停/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/恢复/).length).toBeGreaterThan(0);
  });

  it('shows reconnection button when paused', async () => {
    const user = userEvent.setup();
    render(<SseLogStream />);
    await user.click(screen.getByText(/暂停/));
    await user.click(screen.getAllByText(/恢复/)[0]);
  });

  it('renders level select', () => {
    render(<SseLogStream />);
    expect(screen.getByText(/全部/)).toBeInTheDocument();
  });
});
