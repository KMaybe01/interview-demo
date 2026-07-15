import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Dashboard from '../Dashboard.tsx';

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
});
