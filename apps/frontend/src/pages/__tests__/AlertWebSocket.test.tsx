import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import { useAlertStore } from '../../stores/alertStore.ts';
import AlertWebSocket from '../AlertWebSocket.tsx';

vi.mock('../../utils/wsTransport.ts', () => ({
  ReconnectingTransport: vi.fn().mockImplementation(() => ({
    setCallbacks: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    forceTransport: vi.fn(),
    onFallbackChange: vi.fn(),
    onInterruptionLogged: vi.fn(),
  })),
  MAX_RETRY: 5,
  ConnectionStatus: {
    DISCONNECTED: 'disconnected',
    CONNECTED: 'connected',
    CONNECTING: 'connecting',
    RECONNECTING: 'reconnecting',
  },
}));

vi.mock('echarts', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
  ECharts: vi.fn(),
  EChartsOption: vi.fn(),
}));

function renderPage() {
  return render(
    <AntApp>
      <AlertWebSocket />
    </AntApp>,
  );
}

describe('AlertWebSocket', () => {
  it('renders connection status indicator', () => {
    renderPage();
    expect(screen.getByText(/未连接/)).toBeInTheDocument();
  });

  it('renders transport selector', () => {
    renderPage();
    expect(screen.getByText('WebSocket')).toBeInTheDocument();
    expect(screen.getByText('SSE')).toBeInTheDocument();
    expect(screen.getByText('Polling')).toBeInTheDocument();
  });

  it('renders QPS counter', () => {
    renderPage();
    expect(screen.getByText(/QPS/)).toBeInTheDocument();
  });

  it('shows empty alert state', () => {
    renderPage();
    expect(screen.getByText(/暂无告警/)).toBeInTheDocument();
  });

  it('renders alert trend chart header', () => {
    renderPage();
    expect(screen.getByText(/告警趋势/)).toBeInTheDocument();
  });

  it('clear button resets alerts', async () => {
    const user = userEvent.setup();
    useAlertStore.getState().addAlerts([
      {
        id: 'test-1',
        seq: 1,
        topic: 'alert',
        category: 'system',
        level: 'info',
        message: 'test alert',
        time: new Date().toISOString(),
      },
    ]);
    renderPage();
    await user.click(screen.getByText(/清空/));
    expect(useAlertStore.getState().alerts.length).toBe(0);
  });

  it('renders level segmentation control', () => {
    renderPage();
    expect(screen.getByText(/全部/)).toBeInTheDocument();
  });
});
