export function parseIntParam(value: string): number | null {
  const n = parseInt(value, 10)
  return isNaN(n) ? null : n
}
