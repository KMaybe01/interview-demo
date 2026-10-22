import { reportManager } from './reportManager.ts';
import { ReportPriority } from './types.ts';
import type { TrackEvent } from './types.ts';

export class StatSDK {
  private initialized = false;

  init(): void {
    if (this.initialized) {
      return;
    }
    this.initialized = true;

    document.addEventListener('click', (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-stat]');
      if (!target) {
        return;
      }
      const raw = (target as HTMLElement).dataset.stat;
      if (!raw) {
        return;
      }
      try {
        const partial = JSON.parse(raw) as Omit<TrackEvent, 'timestamp' | 'source'>;
        const event: TrackEvent = {
          ...partial,
          source: 'declarative',
          timestamp: Date.now(),
        };
        this.track(event);
      } catch {
        // malformed data-stat, skip silently
      }
    });
  }

  track(
    event: Omit<TrackEvent, 'timestamp' | 'source'> & { timestamp?: number; source?: string },
  ): void {
    reportManager.add({
      data: {
        ...event,
        source: 'code',
        timestamp: event.timestamp ?? Date.now(),
      },
      priority: ReportPriority.LOW,
      timestamp: Date.now(),
    });
  }
}

export const statSDK = new StatSDK();
