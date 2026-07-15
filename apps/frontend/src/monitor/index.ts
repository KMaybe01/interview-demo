import {
  apiMonitor,
  bundleMonitor,
  errorMonitor,
  performanceMonitor,
  setAxiosInstance,
  statSDK,
} from '@interview-demo/shared-monitor';
import { http } from '../utils/fetchClient.ts';

export type {
  APIReport,
  BundleReportSummary,
  DegradationReport,
  ErrorReport,
  MonitorState,
  PerformanceReport,
  TrackEvent,
} from '@interview-demo/shared-monitor';
export {
  apiMonitor,
  bundleMonitor,
  errorMonitor,
  performanceMonitor,
  ReportPriority,
  reportManager,
  statSDK,
} from '@interview-demo/shared-monitor';

export function initMonitor(): void {
  setAxiosInstance(http);
  statSDK.init();
  errorMonitor.init();
  apiMonitor.init();
  performanceMonitor.init();
  bundleMonitor.init();
}
