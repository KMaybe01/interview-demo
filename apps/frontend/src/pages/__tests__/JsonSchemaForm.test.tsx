import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntApp } from 'antd';
import { describe, expect, it, vi } from 'vitest';
import JsonSchemaForm from '../JsonSchemaForm.tsx';

vi.mock('../../utils/fetchClient.ts', () => ({
  http: {
    get: vi.fn().mockResolvedValue({
      data: {
        schema: {
          type: 'tabs',
          tabs: [
            {
              title: '基础配置',
              key: 'basic',
              children: [
                {
                  type: 'card',
                  title: '网络参数',
                  properties: {
                    ipAddress: {
                      type: 'leaf',
                      fieldType: 'string',
                      label: 'IP 地址',
                      required: true,
                    },
                    port: { type: 'leaf', fieldType: 'number', label: '端口号', required: true },
                  },
                },
              ],
            },
          ],
        },
        initialData: { ipAddress: '192.168.1.1', port: 8080 },
      },
    }),
    post: vi.fn().mockResolvedValue({ data: { valid: true, errors: [] } }),
  },
  getErrorMessage: vi.fn(),
}));

function renderPage() {
  return render(
    <AntApp>
      <JsonSchemaForm />
    </AntApp>,
  );
}

describe('JsonSchemaForm', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getAllByText(/5G 网元配置表单/).length).toBeGreaterThan(0);
  });

  it('renders guide section', () => {
    renderPage();
    expect(screen.getByText(/架构说明/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    renderPage();
    expect(screen.getByText(/正在加载表单配置/)).toBeInTheDocument();
  });

  it('renders tabs after loading', async () => {
    renderPage();
    expect(await screen.findByText('表单')).toBeInTheDocument();
    expect(await screen.findByText('JSON 数据')).toBeInTheDocument();
  });

  it('toggles form collapse', async () => {
    const user = userEvent.setup();
    renderPage();
    const formTab = await screen.findByText('表单');
    await user.click(formTab);
  });
});
