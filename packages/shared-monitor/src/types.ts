export interface TrackEvent {
  event: string;
  page: string;
  module: string;
  target?: string;
  value?: number;
  extra?: Record<string, string | number>;
  timestamp: number;
  source?: 'declarative' | 'code';
}

export interface ErrorReport {
  type: 'js_error' | 'promise_error' | 'resource_error' | 'api_error' | 'business_error';
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  col?: number;
  url?: string;
  timestamp: number;
  fingerprint?: string;
}

export interface APIReport {
  type: 'slow_api' | 'api_error';
  url: string;
  method: string;
  duration: number;
  status: number;
  size: number;
  error?: string;
  timestamp: number;
}

export interface PerformanceReport {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
  url: string;
}

export interface BundleChunkEntry {
  name: string;
  type: 'script' | 'style';
  duration: number;
  transferSize: number;
  decodedSize: number;
}

export interface BundleReportSummary {
  totalLoadTime: number;
  totalTransferSize: number;
  chunkCount: number;
  jsCount: number;
  cssCount: number;
  largestChunk: { name: string; size: number; duration: number } | null;
  chunks: BundleChunkEntry[];
  timestamp: number;
}

export interface DegradationReport {
  type: 'degradation';
  module: string;
  reason: 'network_timeout' | 'business_deny' | 'resource_fail';
  fallback: string;
  timestamp: number;
}

export enum ReportPriority {
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
}

export interface ReportItem {
  priority: ReportPriority;
  data: unknown;
  timestamp: number;
}

export interface MonitorState {
  errors: ErrorReport[];
  apiReports: APIReport[];
  performanceReports: PerformanceReport[];
  degradationReports: DegradationReport[];
  bundleReports: BundleReportSummary[];
  totalEvents: number;
  errorCount: number;
  apiSuccessCount: number;
  apiFailCount: number;
  slowApiCount: number;
  resourceFailCount: number;
  slowBundleCount: number;
  addError: (report: ErrorReport) => void;
  addAPIReport: (report: APIReport) => void;
  addPerformanceReport: (report: PerformanceReport) => void;
  addDegradation: (report: DegradationReport) => void;
  addBundleReport: (report: BundleReportSummary) => void;
  incrementEvents: () => void;
  clearAll: () => void;
}
