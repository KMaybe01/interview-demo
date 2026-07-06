import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LogStream from '../LogStream.tsx';

describe('LogStream', () => {
  it('renders decrypt button', () => {
    render(<LogStream />);
    expect(screen.getAllByText(/开始解密/).length).toBeGreaterThan(0);
  });

  it('renders initial state', () => {
    render(<LogStream />);
    expect(screen.getByText(/十万行日志流解密/)).toBeInTheDocument();
  });
});
