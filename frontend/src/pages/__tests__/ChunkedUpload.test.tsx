import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ChunkedUpload from '../ChunkedUpload.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('ChunkedUpload', () => {
  it('renders file upload area', () => {
    render(<ChunkedUpload />);
    expect(screen.getByText(/选择文件/)).toBeInTheDocument();
    expect(screen.getByText(/点击或拖拽文件到此处/)).toBeInTheDocument();
  });
});
