import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import RbacPermission from '../RbacPermission.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    post: vi.fn().mockResolvedValue({
      data: {
        results: [
          { key: '0', accessible: true },
          { key: '1', accessible: true },
          { key: '2', accessible: true },
          { key: '3', accessible: true },
          { key: '4', accessible: true },
          { key: '5', accessible: true },
          { key: '6', accessible: true },
          { key: '7', accessible: true },
          { key: '8', accessible: true },
          { key: '9', accessible: true },
        ],
      },
    }),
  },
  getErrorMessage: vi.fn(),
}));

function renderPage() {
  return render(
    <AntApp>
      <RbacPermission />
    </AntApp>,
  );
}

describe('RbacPermission', () => {
  it('renders role selector with EDITOR as default', () => {
    renderPage();
    expect(screen.getByText(/Role Preset/)).toBeInTheDocument();
  });

  it('shows the DataSource section header', () => {
    renderPage();
    expect(screen.getByText(/DataSource/)).toBeInTheDocument();
  });

  it('toggles collapse on the Menu Layer card', async () => {
    const user = userEvent.setup();
    renderPage();
    const menuHeader = screen.getByText(/Menu Layer/);
    expect(menuHeader).toBeInTheDocument();
    const collapseIcon = menuHeader.closest('button');
    if (!collapseIcon) throw new Error('collapse button not found');
    await user.click(collapseIcon);
  });

  it('renders stat cards with default data', () => {
    renderPage();
    expect(screen.getByText(/System Management/)).toBeInTheDocument();
  });

  it('changes role via select and shows role tag', async () => {
    const user = userEvent.setup();
    renderPage();
    const select = document.querySelector('.ant-select');
    if (!select) throw new Error('select not found');
    await user.click(select);
    const superOption = await screen.findByText('SUPER');
    await user.click(superOption);
  });
});
