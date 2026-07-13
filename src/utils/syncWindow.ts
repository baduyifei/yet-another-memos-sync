/**
 * Daily Notes Interface keys daily notes as `day-<ISO timestamp>`. Restrict
 * destructive reconciliation to the exact cutoff used by the remote snapshot.
 * Invalid keys are excluded for safety rather than treated as in scope.
 */
export function isDailyNoteDateInSyncWindow(
  dateUid: string,
  cutoffTimestamp: number,
): boolean {
  if (cutoffTimestamp <= 0) return true;

  const dateValue = dateUid.startsWith('day-') ? dateUid.slice(4) : dateUid;
  const timestamp = Date.parse(dateValue);
  if (Number.isNaN(timestamp)) return false;

  return Math.floor(timestamp / 1000) >= cutoffTimestamp;
}
