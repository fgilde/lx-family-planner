/**
 * Generates client-side draft IDs before the server assigns its persistent ID.
 * Keeping this outside the provider makes the resource modules independent of
 * React state and easy to reuse during the larger context split.
 */
export function makeClientId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
