export interface VitalsSnapshot {
  LCP: number
  INP: number
  CLS: number
}

const snapshot: VitalsSnapshot = {
  LCP: 0,
  INP: 0,
  CLS: 0,
}

export function updateVitalsSnapshot(metric: string, value: number): void {
  if (metric === "LCP" || metric === "INP" || metric === "CLS") {
    ;(snapshot as unknown as Record<string, number>)[metric] = value
  }
}

export function getVitalsSnapshot(): VitalsSnapshot {
  return { ...snapshot }
}
