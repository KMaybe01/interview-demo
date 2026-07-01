import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import GisRendering from '../GisRendering.tsx';

vi.mock('../GisRendering.tsx');

describe('GisRendering', () => {
  it('renders stat cards', () => {
    render(<GisRendering />);
    expect(screen.getByText(/渲染耗时/)).toBeInTheDocument();
  });

  it('renders slider controls', () => {
    render(<GisRendering />);
    expect(screen.getByText(/点位数量/)).toBeInTheDocument();
    expect(screen.getByText(/聚合距离/)).toBeInTheDocument();
  });

  it('shows point count tag', () => {
    render(<GisRendering />);
    expect(screen.getByText(/10\.0万/)).toBeInTheDocument();
  });

  it('shows visible count', () => {
    render(<GisRendering />);
    expect(screen.getByText(/可见/)).toBeInTheDocument();
  });
});
