/**
 * 极简 trace 记录器（教学版）。
 *
 * 字段口径与 backend/internal/obs 对齐（TraceID/SpanID/ParentID/Kind/Status/Attrs），
 * 目标是能在前端画出"这次请求到底发生了什么"的瀑布图。
 */

export type SpanKind = 'llm' | 'tool' | 'retrieval' | 'guard' | 'http' | 'agent';

export interface Span {
  traceId: string;
  spanId: string;
  parentId?: string;
  name: string;
  kind: SpanKind;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  status: 'ok' | 'error';
  error?: string;
  attrs?: Record<string, unknown>;
}

export interface Trace {
  traceId: string;
  name: string;
  startMs: number;
  spans: Span[];
}

/** 与 Go 侧保持同一量级：内存里只保留"最近可排查量" */
const TRACE_CAP = 200;
const traces: Trace[] = [];
let sequence = 0;

function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${Date.now().toString(36)}_${sequence}`;
}

export function startTrace(name: string): { traceId: string; root: Span } {
  const traceId = nextId('trace');
  const trace: Trace = { traceId, name, startMs: Date.now(), spans: [] };
  traces.push(trace);
  if (traces.length > TRACE_CAP) traces.shift();
  return { traceId, root: startSpan(traceId, name, 'http') };
}

export function startSpan(traceId: string, name: string, kind: SpanKind, parentId?: string): Span {
  const span: Span = {
    traceId,
    spanId: nextId('span'),
    parentId,
    name,
    kind,
    startMs: Date.now(),
    status: 'ok',
  };
  const trace = traces.find((item) => item.traceId === traceId);
  trace?.spans.push(span);
  return span;
}

export function endSpan(
  span: Span,
  status: 'ok' | 'error' = 'ok',
  attrs?: Record<string, unknown>,
  error?: string,
): void {
  span.endMs = Date.now();
  span.durationMs = span.endMs - span.startMs;
  span.status = status;
  if (attrs) span.attrs = { ...span.attrs, ...attrs };
  if (error) span.error = error;
}

export function listTraces(): Trace[] {
  return [...traces].reverse();
}

export function getTrace(traceId: string): Trace | undefined {
  return traces.find((item) => item.traceId === traceId);
}

/** 把内存 trace 清空（测试与演示用） */
export function resetTraces(): void {
  traces.length = 0;
}
