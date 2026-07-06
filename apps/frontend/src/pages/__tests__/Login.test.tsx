import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from '../Login.tsx';

function renderLogin() {
  return render(
    <MemoryRouter>
      <AntApp>
        <Login />
      </AntApp>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  it('renders login form', () => {
    renderLogin();
    expect(screen.getByPlaceholderText('用户名')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('密码')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /登\s*录/ })).toBeInTheDocument();
  });

  it('shows validation errors when submitting empty form', async () => {
    const user = userEvent.setup();
    renderLogin();
    const usernameInput = screen.getByPlaceholderText('用户名');
    const passwordInput = screen.getByPlaceholderText('密码');
    await user.clear(usernameInput);
    await user.clear(passwordInput);
    await user.click(screen.getByRole('button', { name: /登\s*录/ }));
    expect(await screen.findByText('请输入用户名')).toBeInTheDocument();
  });

  it('renders with default values', () => {
    renderLogin();
    const usernameInput = screen.getByPlaceholderText('用户名') as HTMLInputElement;
    expect(usernameInput.value).toBe('admin');
  });

  it('displays copyright with current year', () => {
    renderLogin();
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year} Interview Demo`)).toBeInTheDocument();
  });
});
