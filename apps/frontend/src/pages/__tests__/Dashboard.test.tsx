import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {describe, expect, it, vi} from 'vitest';
import Dashboard from '../Dashboard.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    get: vi.fn().mockResolvedValue({ data: [] }),
  },
  getErrorMessage: vi.fn(),
}));

function renderDashboard() {
  return render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
}

describe('Dashboard', () => {
  it('renders tech stack title', () => {
    renderDashboard();
    expect(screen.getByText(/React 19 \+ Ant Design 6/)).toBeInTheDocument();
  });

  it('shows empty state when no pages visited', async () => {
    renderDashboard();
    expect(await screen.findByText(/暂无页面访问记录/)).toBeInTheDocument();
  });
});
