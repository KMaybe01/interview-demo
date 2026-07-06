import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { routes } from '../routes';
import { http } from '../utils/fetchClient.ts';
import { getVitalsSnapshot } from '../utils/vitalsSnapshot.ts';

function getPageName(pathname: string): string {
  const r = routes.find((r) => r.path === pathname);
  return r?.name ?? pathname;
}

const navigationTimings: ReadonlyMap<string, number> = (() => {
  const timings = new Map<string, number>();
  if (typeof performance.getEntriesByType === 'function') {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      timings.set('domContentLoaded', nav.domContentLoadedEventEnd - nav.startTime);
      timings.set('domComplete', nav.domComplete - nav.startTime);
      timings.set('load', nav.loadEventEnd - nav.startTime);
    }
  }
  return timings;
})();

export default function PageTracker({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const pathname = location.pathname;
  const renderStartRef = useRef(0);
  const reportedRef = useRef(false);
  const prevPathRef = useRef(pathname);
  const referrerRef = useRef('');

  if (prevPathRef.current !== pathname) {
    referrerRef.current = prevPathRef.current;
    prevPathRef.current = pathname;
    reportedRef.current = false;
    renderStartRef.current = performance.now();
  }

  useEffect(() => {
    if (reportedRef.current) return;
    reportedRef.current = true;

    // Use setTimeout to ensure we measure after the browser has painted
    const timer = setTimeout(() => {
      const renderEnd = performance.now();
      const renderDuration = renderEnd - renderStartRef.current;
      const pageName = getPageName(pathname);

      const v = getVitalsSnapshot();
      http
        .post('/api/vitals/page-report', [
          {
            path: pathname,
            pageName,
            renderDuration: Math.round(renderDuration * 100) / 100,
            lcp: v.LCP,
            inp: v.INP,
            cls: v.CLS,
            referrer: referrerRef.current,
          },
        ])
        // biome-ignore lint/suspicious/noConsole: log API errors for debugging
        .catch((err) => console.warn('[PageTracker] page-report failed', err));

      if (navigationTimings.size > 0 && pathname !== '/login') {
        http
          .post(
            '/api/vitals/report',
            Array.from(navigationTimings.entries()).map(([metric, value]) => ({
              metric,
              value: Math.round(value * 100) / 100,
              rating: 'good',
              url: pathname,
              version: 'navigation',
            })),
          )
          // biome-ignore lint/suspicious/noConsole: log API errors for debugging
          .catch((err) => console.warn('[PageTracker] vitals/report failed', err));
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [pathname]);

  return children;
}
