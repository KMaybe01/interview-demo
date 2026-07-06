import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getErrorMessage } from '../fetchClient.ts';

describe('getErrorMessage', () => {
  it('returns error message from response data.error', () => {
    const err = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { error: 'custom error message' },
    } as any);
    expect(getErrorMessage(err)).toBe('custom error message');
  });

  it('returns error message from response data.message', () => {
    const err = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 400,
      data: { message: 'custom message' },
    } as any);
    expect(getErrorMessage(err)).toBe('custom message');
  });

  it('returns preset message for known HTTP status codes', () => {
    const err403 = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 403,
      data: {},
    } as any);
    expect(getErrorMessage(err403)).toBe('没有权限访问该资源');

    const err404 = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      data: {},
    } as any);
    expect(getErrorMessage(err404)).toBe('请求的资源不存在');

    const err500 = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 500,
      data: {},
    } as any);
    expect(getErrorMessage(err500)).toBe('服务器内部错误');
  });

  it('returns network error when no response', () => {
    const err = new axios.AxiosError('msg', 'ERR_NETWORK');
    expect(getErrorMessage(err)).toBe('网络错误，请检查后端服务是否正常运行');
  });

  it('returns fallback for unknown status code', () => {
    const err = new axios.AxiosError('msg', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 418,
      data: {},
    } as any);
    expect(getErrorMessage(err)).toBe('请求失败 (418)');
  });

  it('returns Error.message for non-axios errors', () => {
    expect(getErrorMessage(new Error('something went wrong'))).toBe('something went wrong');
  });

  it('returns fallback for unknown error types', () => {
    expect(getErrorMessage('string error')).toBe('发生未知错误');
  });
});
