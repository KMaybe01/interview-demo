import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { describe, expect, it } from 'vitest';
import TreeDataEngine from '../TreeDataEngine.tsx';

function renderPage() {
  return render(
    <AntApp>
      <TreeDataEngine />
    </AntApp>,
  );
}

describe('TreeDataEngine', () => {
  it('renders stat cards', () => {
    renderPage();
    expect(screen.getByText('Total Nodes')).toBeInTheDocument();
    expect(screen.getByText('Max Depth')).toBeInTheDocument();
    expect(screen.getByText('Folders')).toBeInTheDocument();
  });

  it('renders initial nodes', () => {
    renderPage();
    expect(screen.getByText(/Project Root/)).toBeInTheDocument();
    expect(screen.getByText(/src/)).toBeInTheDocument();
    expect(screen.getByText(/package.json/)).toBeInTheDocument();
  });

  it('renders action buttons', { timeout: 15000 }, () => {
    renderPage();
    expect(screen.getByRole('button', { name: /Add Root Node/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Validate Tree/i })).toBeInTheDocument();
  });

  it('shows tree engine title', () => {
    renderPage();
    expect(screen.getByText(/Tree Data Engine/)).toBeInTheDocument();
  });

  it('validate tree shows success message', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Validate Tree/i }));
  });

  it('opens add root modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Add Root Node/i }));
    expect(screen.getByText(/Select node type/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OK/i })).toBeInTheDocument();
  });

  it('cancel add root modal closes it', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /Add Root Node/i }));
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
  });

  it('renders file and folder icons in tree', () => {
    renderPage();
    expect(screen.getByText(/Header\.tsx/)).toBeInTheDocument();
    expect(screen.getByText(/Footer\.tsx/)).toBeInTheDocument();
    expect(screen.getByText(/tsconfig\.json/)).toBeInTheDocument();
  });
});
