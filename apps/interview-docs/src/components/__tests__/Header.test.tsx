import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import Header from '../Header';

vi.mock('../GlobalSearch', () => ({
  default: function MockSearch({ onClose }: { onClose: () => void }) {
    return (
      <div data-testid="global-search">
        <button onClick={onClose} type="button">
          close
        </button>
      </div>
    );
  },
}));

interface HeaderProps {
  menuOpen?: boolean;
  onToggleMenu?: () => void;
  onCloseMenu?: () => void;
  showMenuButton?: boolean;
}

function renderHeader(props: HeaderProps = {}) {
  return render(
    <MemoryRouter>
      <Header
        menuOpen={props.menuOpen ?? false}
        onToggleMenu={props.onToggleMenu ?? (() => {})}
        onCloseMenu={props.onCloseMenu ?? (() => {})}
        showMenuButton={props.showMenuButton ?? true}
      />
    </MemoryRouter>,
  );
}

describe('Header', () => {
  it('renders logo and title', () => {
    renderHeader();
    expect(screen.getByText('前端知识体系')).toBeInTheDocument();
    expect(screen.getByAltText('Logo')).toBeInTheDocument();
  });

  it('no longer renders the top navigation dropdowns', () => {
    renderHeader();
    expect(screen.queryByText('基础夯实')).not.toBeInTheDocument();
    expect(screen.queryByText('Go 语言')).not.toBeInTheDocument();
    expect(document.querySelector('.header-nav')).toBeNull();
  });

  it('reflects the drawer state on the hamburger button and forwards toggles', async () => {
    const user = userEvent.setup();
    const onToggleMenu = vi.fn();
    const { rerender } = renderHeader({ onToggleMenu });

    const button = screen.getByLabelText('菜单');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveClass('open');

    await user.click(button);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <Header menuOpen onToggleMenu={onToggleMenu} onCloseMenu={() => {}} showMenuButton />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('菜单')).toHaveClass('open');
    expect(screen.getByLabelText('菜单')).toHaveAttribute('aria-expanded', 'true');
  });

  it('hides the hamburger when there is no sidebar to open', () => {
    renderHeader({ showMenuButton: false });
    expect(screen.queryByLabelText('菜单')).not.toBeInTheDocument();
  });

  it('closes the drawer when the logo is clicked', async () => {
    const user = userEvent.setup();
    const onCloseMenu = vi.fn();
    renderHeader({ menuOpen: true, onCloseMenu });

    await user.click(screen.getByText('前端知识体系'));
    expect(onCloseMenu).toHaveBeenCalledTimes(1);
  });

  it('opens search modal when search button is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();

    expect(screen.queryByTestId('global-search')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('搜索'));
    expect(screen.getByTestId('global-search')).toBeInTheDocument();
  });

  it('closes search modal when GlobalSearch fires onClose', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByLabelText('搜索'));
    expect(screen.getByTestId('global-search')).toBeInTheDocument();

    await user.click(screen.getByText('close'));
    expect(screen.queryByTestId('global-search')).not.toBeInTheDocument();
  });

  it('renders theme toggle', () => {
    renderHeader();
    const toggle = document.querySelector('.theme-switch input[type="checkbox"]');
    expect(toggle).toBeInTheDocument();
  });

  it('renders GitHub link', () => {
    renderHeader();
    const githubLink = screen.getByTitle('GitHub');
    expect(githubLink).toHaveAttribute('href', 'https://github.com/KMaybe01/interview-demo');
    expect(githubLink).toHaveAttribute('target', '_blank');
  });
});
