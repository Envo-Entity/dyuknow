/** Money as the app shows it: whole pounds as "£18", otherwise "£18.50" (§10.8). */
export function pounds(n: number) {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}
