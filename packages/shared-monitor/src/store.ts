import { create } from 'zustand';
import type { MonitorState } from './types.ts';

const MAX_STORED_ITEMS = 200;

export const useMonitorStore = create<MonitorState>((set) => ({
  addAPIReport: (report) => {
    set((state) => {
      const isFail = report.type === 'api_error';
      return {
        apiFailCount: isFail ? state.apiFailCount + 1 : state.apiFailCount,
        apiReports: [report, ...state.apiReports].slice(0, MAX_STORED_ITEMS),
        apiSuccessCount: isFail ? state.apiSuccessCount : state.apiSuccessCount + 1,
        slowApiCount: report.type === 'slow_api' ? state.slowApiCount + 1 : state.slowApiCount,
      };
    });
  },
  addBundleReport: (report) => {
    set((state) => ({
      bundleReports: [report, ...state.bundleReports].slice(0, MAX_STORED_ITEMS),
      slowBundleCount:
        report.totalLoadTime > 3000 ? state.slowBundleCount + 1 : state.slowBundleCount,
    }));
  },
  addDegradation: (report) => {
    set((state) => ({
      degradationReports: [report, ...state.degradationReports].slice(0, MAX_STORED_ITEMS),
    }));
  },
  addError: (report) => {
    set((state) => ({
      errorCount: state.errorCount + 1,
      errors: [report, ...state.errors].slice(0, MAX_STORED_ITEMS),
    }));
  },
  addPerformanceReport: (report) => {
    set((state) => ({
      performanceReports: [report, ...state.performanceReports].slice(0, MAX_STORED_ITEMS),
    }));
  },
  apiFailCount: 0,
  apiReports: [],
  apiSuccessCount: 0,
  bundleReports: [],
  clearAll: () => {
    set({
      apiFailCount: 0,
      apiReports: [],
      apiSuccessCount: 0,
      bundleReports: [],
      degradationReports: [],
      errorCount: 0,
      errors: [],
      performanceReports: [],
      resourceFailCount: 0,
      slowApiCount: 0,
      slowBundleCount: 0,
      totalEvents: 0,
    });
  },
  degradationReports: [],
  errorCount: 0,
  errors: [],
  incrementEvents: () => {
    set((state) => ({ totalEvents: state.totalEvents + 1 }));
  },
  performanceReports: [],
  resourceFailCount: 0,
  slowApiCount: 0,
  slowBundleCount: 0,
  totalEvents: 0,
}));
