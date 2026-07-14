import { apiMonitor } from './apiMonitor.ts';
import { errorMonitor } from './errorMonitor.ts';
import { performanceMonitor } from './performanceMonitor.ts';
import { statSDK } from './statSDK.ts';

export { apiMonitor } from './apiMonitor.ts';
export { errorMonitor } from './errorMonitor.ts';
export { performanceMonitor } from './performanceMonitor.ts';
export { reportManager, setReportEndpoint } from './reportManager.ts';
export { statSDK } from './statSDK.ts';
export { useMonitorStore } from './store.ts';
export { withDegradation } from './degradation.ts';
export { setAxiosInstance } from './apiMonitor.ts';
export type {
  APIReport,
  DegradationReport,
  ErrorReport,
  MonitorState,
  PerformanceReport,
  TrackEvent,
} from './types.ts';
export { ReportPriority } from './types.ts';

export function initMonitor(): void {
  statSDK.init();
  errorMonitor.init();
  apiMonitor.init();
  performanceMonitor.init();
}
