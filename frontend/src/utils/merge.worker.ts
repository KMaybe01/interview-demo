interface WorkerMessage {
  data: number[]
  seq: number
}

function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr
  const mid = Math.floor(arr.length / 2)
  const left = mergeSort(arr.slice(0, mid))
  const right = mergeSort(arr.slice(mid))
  return merge(left, right)
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = []
  let i = 0
  let j = 0
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) {
      result.push(left[i])
      i++
    } else {
      result.push(right[j])
      j++
    }
  }
  return [...result, ...left.slice(i), ...right.slice(j)]
}

self.onmessage = (e: MessageEvent<WorkerMessage>) => {
  const sorted = mergeSort(e.data.data)
  self.postMessage({ data: sorted, seq: e.data.seq } satisfies WorkerMessage)
}
