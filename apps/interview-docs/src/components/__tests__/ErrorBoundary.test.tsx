import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';

const GoodChild = () => <div>正常内容</div>;

const BadChild = () => {
  throw new Error('测试错误');
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <GoodChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  it('renders error UI when child throws', () => {
    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );
    expect(screen.getByText('出错了')).toBeInTheDocument();
    expect(screen.getByText('测试错误')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重新加载' })).toBeInTheDocument();
  });

  it('shows unknown error message when error has no message', () => {
    const EmptyError = () => {
      throw new Error();
    };
    render(
      <ErrorBoundary>
        <EmptyError />
      </ErrorBoundary>,
    );
    expect(screen.getByText('未知错误')).toBeInTheDocument();
  });

  it('reload button calls window.location.reload', async () => {
    const reloadFn = vi.fn();
    const { location: originalLocation } = window;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, reload: reloadFn },
      writable: true,
    });
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <BadChild />
      </ErrorBoundary>,
    );

    await user.click(screen.getByRole('button', { name: '重新加载' }));
    expect(reloadFn).toHaveBeenCalled();
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });
});
