import { Memo } from '../types';

const RECORD_KEY_SEPARATOR = '::';

export interface MemoRecordIdentity {
  blockId: string;
  legacyTimestampId: string;
  legacyDatabaseId: string;
  timestamp: number;
}

function sanitizeBlockId(value: string): string {
  return value
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Prefer Memos' immutable UID. The database ID is the stable fallback, while
 * the creation timestamp is retained only for servers that expose neither.
 */
export function getMemoBlockId(memo: Memo, timestamp: number): string {
  const uid = typeof memo.uid === 'string' ? sanitizeBlockId(memo.uid) : '';
  if (uid) return uid;

  // Memos v0.21 exposes the permanent memo UID as the v1 API `name` field.
  const legacyApiName = typeof memo.name === 'string' ? sanitizeBlockId(memo.name) : '';
  if (legacyApiName) return legacyApiName;

  if (memo.id !== undefined && memo.id !== null) {
    const stableId = sanitizeBlockId(String(memo.id));
    if (stableId) return `memos-${stableId}`;
  }

  return String(timestamp);
}

export function getLegacyDatabaseBlockId(memo: Memo): string {
  if (memo.id === undefined || memo.id === null) return '';
  const stableId = sanitizeBlockId(String(memo.id));
  return stableId ? `memos-${stableId}` : '';
}

/**
 * Internal record keys carry both the immutable block ID and the legacy
 * timestamp. The latter lets existing ^1234567890 backups migrate in place.
 */
export function createMemoRecordKey(blockId: string, timestamp: number, legacyDatabaseId = ''): string {
  return `${blockId}${RECORD_KEY_SEPARATOR}${timestamp}${RECORD_KEY_SEPARATOR}${legacyDatabaseId}`;
}

export function parseMemoRecordKey(recordKey: string): MemoRecordIdentity {
  const parts = recordKey.split(RECORD_KEY_SEPARATOR);
  if (parts.length >= 2) {
    const [blockId, timestampText, legacyDatabaseId = ''] = parts;
    const timestamp = Number.parseInt(timestampText, 10);
    if (blockId && Number.isFinite(timestamp) && timestamp > 0) {
      return {
        blockId,
        legacyTimestampId: timestampText,
        legacyDatabaseId,
        timestamp,
      };
    }
  }

  const legacyTimestamp = Number.parseInt(recordKey, 10);
  return {
    blockId: recordKey,
    legacyTimestampId: /^\d+$/.test(recordKey) ? recordKey : '',
    legacyDatabaseId: '',
    timestamp: Number.isFinite(legacyTimestamp) ? legacyTimestamp : 0,
  };
}
