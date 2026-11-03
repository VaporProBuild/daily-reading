/** Sorted, non-overlapping inclusive ranges of indexes, e.g. [[0, 12], [40, 41]] */
export type Ranges = [number, number][]

export function hasIndex(ranges: Ranges, index: number): boolean {
  return ranges.some(([start, end]) => index >= start && index <= end)
}

/** Returns a new range list with the index added and neighbouring ranges merged. */
export function addIndex(ranges: Ranges, index: number): Ranges {
  if (hasIndex(ranges, index)) return ranges
  const next: Ranges = [...ranges.map((r) => [...r] as [number, number]), [index, index]]
  next.sort((a, b) => a[0] - b[0])
  const merged: Ranges = []
  for (const range of next) {
    const last = merged[merged.length - 1]
    if (last && range[0] <= last[1] + 1) last[1] = Math.max(last[1], range[1])
    else merged.push(range)
  }
  return merged
}
