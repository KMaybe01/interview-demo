import { beforeEach, describe, expect, it } from 'vitest';
import { type AlertMessage, useAlertStore } from '../alertStore.ts';

function makeAlert(overrides: Partial<AlertMessage> = {}): AlertMessage {
  return {
    id: 'alert-1',
    seq: 1,
    topic: 'alert',
    category: 'system',
    level: 'info',
    message: 'test alert',
    time: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  useAlertStore.setState({
    alerts: [],
    metrics: {
      totalReceived: 0,
      countByLevel: { critical: 0, major: 0, minor: 0, info: 0 },
      countByTopic: { alert: 0, status: 0, log: 0 },
      timestamps: [],
      interruptionCount: 0,
      totalDowntimeMs: 0,
      lastSeq: 0,
      gapsDetected: 0,
    },
  });
});

describe('alertStore', () => {
  it('starts with empty alerts', () => {
    const state = useAlertStore.getState();
    expect(state.alerts).toEqual([]);
    expect(state.metrics.totalReceived).toBe(0);
  });

  it('addAlerts updates metrics', () => {
    useAlertStore.getState().addAlerts([makeAlert()]);
    const state = useAlertStore.getState();
    expect(state.alerts).toHaveLength(1);
    expect(state.metrics.totalReceived).toBe(1);
    expect(state.metrics.countByLevel.info).toBe(1);
    expect(state.metrics.countByTopic.alert).toBe(1);
  });

  it('addAlerts detects gaps in seq', () => {
    useAlertStore.getState().addAlerts([makeAlert({ seq: 1 })]);
    useAlertStore.getState().addAlerts([makeAlert({ id: 'alert-2', seq: 5 })]);
    expect(useAlertStore.getState().metrics.gapsDetected).toBe(1);
    expect(useAlertStore.getState().metrics.lastSeq).toBe(5);
  });

  it('logInterruption increments interruption count', () => {
    useAlertStore.getState().logInterruption(5000);
    const state = useAlertStore.getState();
    expect(state.metrics.interruptionCount).toBe(1);
    expect(state.metrics.totalDowntimeMs).toBe(5000);
  });

  it('logGap increments gap count', () => {
    useAlertStore.getState().logGap(1, 5);
    expect(useAlertStore.getState().metrics.gapsDetected).toBe(1);
  });

  it('setSeq updates lastSeq', () => {
    useAlertStore.getState().setSeq(100);
    expect(useAlertStore.getState().metrics.lastSeq).toBe(100);
  });

  it('clearAlerts empties alert list', () => {
    useAlertStore.getState().addAlerts([makeAlert()]);
    useAlertStore.getState().clearAlerts();
    expect(useAlertStore.getState().alerts).toEqual([]);
  });

  it('resetMetrics resets all counters', () => {
    useAlertStore.getState().addAlerts([makeAlert()]);
    useAlertStore.getState().logInterruption(1000);
    useAlertStore.getState().resetMetrics();
    const m = useAlertStore.getState().metrics;
    expect(m.totalReceived).toBe(0);
    expect(m.interruptionCount).toBe(0);
    expect(m.gapsDetected).toBe(0);
  });
});
