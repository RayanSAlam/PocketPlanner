// Realtime echoes back our OWN mutations too, not just changes from other
// tabs/devices — without this, the "budget updated elsewhere" toast would
// fire on every single edit you make yourself. Mutation hooks mark a line
// id right before they write; the realtime handler checks this (short TTL,
// just long enough to cover the round-trip) before deciding a change is
// genuinely external.
const recent = new Map<string, number>();
const TTL_MS = 4000;

export function markRecentEdit(lineId: string): void {
  recent.set(lineId, Date.now() + TTL_MS);
}

export function isRecentEdit(lineId: string): boolean {
  const expiry = recent.get(lineId);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    recent.delete(lineId);
    return false;
  }
  return true;
}
