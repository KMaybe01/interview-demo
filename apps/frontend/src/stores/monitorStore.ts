import { create } from 'zustand';
import type { MonitorState } from '../monitor/types.ts';

const MAX_STORED_ITEMS = 200;

export const useMonitorStore = create<MonitorState>((set) => ({
  errors: [],
  apiReports: [],
  performanceReports: [],
  degradationReports: [],
  totalEvents: 0,
  errorCount: 0,
  apiSuccessCount: 0,
  apiFailCount: 0,
  slowApiCount: 0,
  resourceFailCount: 0,

  addError: (report) => {
    set((state) => ({
      errors: [report, ...state.errors].slice(0, MAX_STORED_ITEMS),
      errorCount: state.errorCount + 1,
    }));
  },

  addAPIReport: (report) => {
    set((state) => {
      const isFail = report.type === 'api_error';
      return {
        apiReports: [report, ...state.apiReports].slice(0, MAX_STORED_ITEMS),
        apiSuccessCount: isFail ? state.apiSuccessCount : state.apiSuccessCount + 1,
        apiFailCount: isFail ? state.apiFailCount + 1 : state.apiFailCount,
        slowApiCount: report.type === 'slow_api' ? state.slowApiCount + 1 : state.slowApiCount,
      };
    });
  },

  addPerformanceReport: (report) => {
    set((state) => ({
      performanceReports: [report, ...state.performanceReports].slice(0, MAX_STORED_ITEMS),
    }));
  },

  addDegradation: (report) => {
    set((state) => ({
      degradationReports: [report, ...state.degradationReports].slice(0, MAX_STORED_ITEMS),
    }));
  },

  incrementEvents: () => {
    set((state) => ({ totalEvents: state.totalEvents + 1 }));
  },

  clearAll: () => {
    set({
      errors: [],
      apiReports: [],
      performanceReports: [],
      degradationReports: [],
      totalEvents: 0,
      errorCount: 0,
      apiSuccessCount: 0,
      apiFailCount: 0,
      slowApiCount: 0,
      resourceFailCount: 0,
    });
  },
}));
