import { Memo } from '../types';

const RECORD_KEY_SEPARATOR = '::';

export interface MemoRecordIdentity {
  blockId: string;
  legacyTimestampId: string;
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

  if (memo.id !== undefined && memo.id !== null) {
    const stableId = sanitizeBlockId(String(memo.id));
    if (stableId) return `memos-${stableId}`;
  }

  return String(timestamp);
}

/**
 * Internal record keys carry both the immutable block ID and the legacy
 * timestamp. The latter lets existing ^1234567890 backups migrate in place.
 */
export function createMemoRecordKey(blockId: string, timestamp: number): string {
  return `${blockId}${RECORD_KEY_SEPARATOR}${timestamp}`;
}

export function parseMemoRecordKey(recordKey: string): MemoRecordIdentity {
  const separatorIndex = recordKey.lastIndexOf(RECORD_KEY_SEPARATOR);
  if (separatorIndex > 0) {
    const blockId = recordKey.slice(0, separatorIndex);
    const timestampText = recordKey.slice(separatorIndex + RECORD_KEY_SEPARATOR.length);
    const timestamp = Number.parseInt(timestampText, 10);
    if (blockId && Number.isFinite(timestamp) && timestamp > 0) {
      return {
        blockId,
        legacyTimestampId: timestampText,
        timestamp,
      };
    }
  }

  const legacyTimestamp = Number.parseInt(recordKey, 10);
  return {
    blockId: recordKey,
    legacyTimestampId: /^\d+$/.test(recordKey) ? recordKey : '',
    timestamp: Number.isFinite(legacyTimestamp) ? legacyTimestamp : 0,
  };
}
