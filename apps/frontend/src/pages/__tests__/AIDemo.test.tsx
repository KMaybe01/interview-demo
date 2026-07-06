import { render, screen } from '@testing-library/react';
import { App as AntApp } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import AIDemo from '../AIDemo/AIDemo.tsx';

vi.mock('../AIDemo/services/api.ts', () => ({
  chatApi: { streamChat: vi.fn() },
  getModels: vi.fn().mockResolvedValue([]),
  getPlugins: vi.fn().mockResolvedValue([]),
  getKnowledgeBases: vi.fn().mockResolvedValue([]),
  getAgents: vi.fn().mockResolvedValue([]),
  getDashboard: vi.fn().mockResolvedValue({ stats: {} }),
}));

function renderPage() {
  return render(
    <AntApp>
      <AIDemo />
    </AntApp>,
  );
}

describe('AIDemo', () => {
  it('renders AI Demo page', () => {
    renderPage();
    expect(screen.getByText(/控制台/)).toBeInTheDocument();
  });
});
