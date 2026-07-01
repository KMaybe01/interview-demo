import { beforeEach, describe, expect, it } from 'vitest';
import { type RequestRecord, useRequestLoadingStore } from '../requestLoadingStore.ts';

function makeRequest(overrides: Partial<RequestRecord> = {}): RequestRecord {
  return {
    key: 'req-1',
    method: 'GET',
    path: '/api/test',
    delay: 0,
    startTime: performance.now(),
    duration: null,
    status: 'pending',
    error: null,
    ...overrides,
  };
}

beforeEach(() => {
  useRequestLoadingStore.setState({ requests: [] });
});

describe('requestLoadingStore', () => {
  it('adds a request', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest());
    expect(useRequestLoadingStore.getState().requests).toHaveLength(1);
  });

  it('records resolved status', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest());
    useRequestLoadingStore.getState().recordResolved('req-1');
    const req = useRequestLoadingStore.getState().requests[0];
    expect(req.status).toBe('resolved');
    expect(req.duration).toBeTypeOf('number');
  });

  it('records rejected status with error', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest());
    useRequestLoadingStore.getState().recordRejected('req-1', 'Network Error');
    const req = useRequestLoadingStore.getState().requests[0];
    expect(req.status).toBe('rejected');
    expect(req.error).toBe('Network Error');
  });

  it('records cancelled status', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest());
    useRequestLoadingStore.getState().recordCancelled('req-1');
    const req = useRequestLoadingStore.getState().requests[0];
    expect(req.status).toBe('cancelled');
    expect(req.error).toBe('请求已取消');
  });

  it('removes a request by key', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest());
    useRequestLoadingStore.getState().removeRequest('req-1');
    expect(useRequestLoadingStore.getState().requests).toHaveLength(0);
  });

  it('clears completed requests', () => {
    useRequestLoadingStore.getState().addRequest(makeRequest({ key: 'req-1', status: 'pending' }));
    useRequestLoadingStore.getState().addRequest(makeRequest({ key: 'req-2', status: 'resolved' }));
    useRequestLoadingStore.getState().addRequest(makeRequest({ key: 'req-3', status: 'rejected' }));
    useRequestLoadingStore.getState().clearCompleted();
    expect(useRequestLoadingStore.getState().requests.map((r) => r.key)).toEqual(['req-1']);
  });
});
