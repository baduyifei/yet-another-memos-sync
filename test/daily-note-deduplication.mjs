import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yams-dedup-'));
const bundlePath = path.join(temporaryDirectory, 'daily-note-modifier.mjs');
const identityBundlePath = path.join(temporaryDirectory, 'memo-identity.mjs');
const syncWindowBundlePath = path.join(temporaryDirectory, 'sync-window.mjs');

try {
  await build({
    entryPoints: {
      'daily-note-modifier': 'src/utils/dailyNoteModifier.ts',
      'memo-identity': 'src/utils/memoIdentity.ts',
      'sync-window': 'src/utils/syncWindow.ts',
    },
    bundle: true,
    platform: 'node',
    format: 'esm',
    outdir: temporaryDirectory,
    outExtension: { '.js': '.mjs' },
  });

  const { DailyNoteModifier } = await import(pathToFileURL(bundlePath).href);
  const { createMemoRecordKey, getLegacyDatabaseBlockId, getMemoBlockId, parseMemoRecordKey } = await import(
    pathToFileURL(identityBundlePath).href
  );
  const { isDailyNoteDateInSyncWindow } = await import(pathToFileURL(syncWindowBundlePath).href);
  const modifier = new DailyNoteModifier("## Today's Memos");
  const timestamp = '1783037940';
  const uid = 'j3czVVLfdaXpHNwTitnB7B';
  const databaseBlockId = 'memos-1393';
  const recordKey = createMemoRecordKey(uid, Number(timestamp), databaseBlockId);
  const remoteMemo = `> [!info] 08:19\n> Remote edit\n>\n> ^${uid}`;

  assert.equal(getMemoBlockId({ uid, content: '' }, Number(timestamp)), uid);
  assert.equal(getMemoBlockId({ name: uid, id: 1393, content: '' }, Number(timestamp)), uid);
  assert.equal(getMemoBlockId({ id: 996, content: '' }, Number(timestamp)), 'memos-996');
  assert.equal(getMemoBlockId({ content: '' }, Number(timestamp)), timestamp);
  assert.equal(getLegacyDatabaseBlockId({ id: 1393, content: '' }), databaseBlockId);
  assert.deepEqual(parseMemoRecordKey(recordKey), {
    blockId: uid,
    legacyTimestampId: timestamp,
    legacyDatabaseId: databaseBlockId,
    timestamp: Number(timestamp),
  });
  const duplicatedNote = `# 2026-07-03

## Today‘s Notes

Other content

## Today‘s Memos

> [!info] 08:19
> First local backup
>
> ^${timestamp}

## Today's Memos

> [!info] 08:19
> Duplicate backup
>
> ^${timestamp}
`;

  const repaired = modifier.modifyDailyNote(
    duplicatedNote,
    '2026-07-03',
    { [recordKey]: remoteMemo },
    false,
  );

  assert.ok(repaired, 'a duplicated note should be repaired');
  assert.equal((repaired.match(/\^1783037940\b/g) ?? []).length, 0);
  assert.equal((repaired.match(new RegExp(`\\^${uid}\\b`, 'g')) ?? []).length, 1);
  assert.equal((repaired.match(/^## Today.s Memos$/gm) ?? []).length, 1);
  assert.match(repaired, /Remote edit/);
  assert.doesNotMatch(repaired, /First local backup|Duplicate backup/);

  const wrongDatabaseIdNote = `# Note\n\n## Today's Memos\n\n> [!info] Existing\n> ^${databaseBlockId}\n`;
  const migratedDatabaseIdNote = modifier.modifyDailyNote(
    wrongDatabaseIdNote,
    '2026-07-03',
    { [recordKey]: remoteMemo },
    false,
  );
  assert.ok(migratedDatabaseIdNote);
  assert.match(migratedDatabaseIdNote, new RegExp(`\\^${uid}\\b`));
  assert.match(migratedDatabaseIdNote, /Remote edit/);
  assert.doesNotMatch(migratedDatabaseIdNote, /\^memos-1393\b/);

  const movedTimestamp = 1784000000;
  const movedRecordKey = createMemoRecordKey(uid, movedTimestamp, databaseBlockId);
  const movedRemoteMemo = `> [!tip] 14:30\n> Updated after moving time\n>\n> ^${uid}`;
  const updatedInPlace = modifier.modifyDailyNote(
    repaired,
    '2026-07-14',
    { [movedRecordKey]: movedRemoteMemo },
    false,
  );
  assert.ok(updatedInPlace, 'changing content or time should update the existing UID record');
  assert.match(updatedInPlace, /14:30/);
  assert.match(updatedInPlace, /Updated after moving time/);
  assert.equal((updatedInPlace.match(new RegExp(`\\^${uid}\\b`, 'g')) ?? []).length, 1);
  assert.equal(
    modifier.modifyDailyNote(updatedInPlace, '2026-07-14', { [movedRecordKey]: movedRemoteMemo }, false),
    undefined,
    'repeating the same force sync must be idempotent',
  );

  const existingElsewhere = `# Note\n\n## Archive\n\n${remoteMemo}\n`;
  assert.equal(
    modifier.modifyDailyNote(existingElsewhere, '2026-07-03', { [recordKey]: remoteMemo }, false),
    undefined,
    'an ID elsewhere in the Daily Note must block a duplicate insert',
  );

  const firstBackup = modifier.modifyDailyNote('# Note\n', '2026-07-03', { [recordKey]: remoteMemo }, false);
  assert.ok(firstBackup);
  assert.equal((firstBackup.match(new RegExp(`\\^${uid}\\b`, 'g')) ?? []).length, 1);

  const anotherUid = 'anotherStableMemoUid123';
  const oldDateNote = `# Old date\n\n## Today's Memos\n\n${remoteMemo}\n\n> [!info] Keep me\n> ^${anotherUid}\n`;
  const oldDateAfterMove = modifier.removeMemoRecords(oldDateNote, new Set([uid]));
  assert.ok(oldDateAfterMove, 'the source Daily Note should change during a cross-date move');
  assert.doesNotMatch(oldDateAfterMove, new RegExp(`\\^${uid}\\b`));
  assert.match(oldDateAfterMove, new RegExp(`\\^${anotherUid}\\b`));
  assert.match(oldDateAfterMove, /^## Today's Memos$/m, 'the empty-capable Memos heading should be retained');

  const newDateNote = modifier.modifyDailyNote(
    '# New date\n',
    '2026-07-14',
    { [movedRecordKey]: movedRemoteMemo },
    false,
  );
  assert.ok(newDateNote);
  assert.equal((newDateNote.match(new RegExp(`\\^${uid}\\b`, 'g')) ?? []).length, 1);
  assert.match(newDateNote, /Updated after moving time/);

  assert.equal(
    modifier.modifyDailyNote('# Different day\n', '2026-07-14', { [movedRecordKey]: remoteMemo }, false, new Set([uid])),
    undefined,
    'a UID already present in another Daily Note must block a cross-date duplicate',
  );

  const deletedUidA = 'deletedRemoteMemoUidA';
  const deletedUidB = 'deletedRemoteMemoUidB';
  const mirrorNote = `---\ntags:\n  - daily\n---\n\n## Today's Notes\n\nDo not touch this text.\n\n## Today's Memos\n\n> [!info] Keep\n> ^${uid}\n\n> [!info] Deleted A\n> ^${deletedUidA}\n\n> [!warning] Deleted B\n> ^${deletedUidB}\n\n## Footer\n\nKeep the footer too.\n`;
  assert.deepEqual(
    modifier.getManagedMemoIds(mirrorNote),
    new Set([uid, deletedUidA, deletedUidB]),
  );
  const remoteIds = new Set([uid]);
  const staleIds = new Set(
    Array.from(modifier.getManagedMemoIds(mirrorNote)).filter(id => !remoteIds.has(id)),
  );
  const mirrored = modifier.removeMemoRecords(mirrorNote, staleIds);
  assert.ok(mirrored, 'remote deletions should remove stale managed Memo blocks');
  assert.match(mirrored, new RegExp(`\\^${uid}\\b`));
  assert.doesNotMatch(mirrored, new RegExp(`\\^${deletedUidA}\\b`));
  assert.doesNotMatch(mirrored, new RegExp(`\\^${deletedUidB}\\b`));
  assert.match(mirrored, /Do not touch this text\./);
  assert.match(mirrored, /Keep the footer too\./);
  assert.match(mirrored, /^## Today's Memos$/m);

  const sevenDayCutoff = Math.floor(Date.parse('2026-07-06T00:00:00+08:00') / 1000);
  assert.equal(
    isDailyNoteDateInSyncWindow('day-2026-07-06T00:00:00+08:00', sevenDayCutoff),
    true,
    'the first day of the configured window must be included',
  );
  assert.equal(
    isDailyNoteDateInSyncWindow('day-2026-07-05T00:00:00+08:00', sevenDayCutoff),
    false,
    'notes older than the configured window must not be deletion candidates',
  );
  assert.equal(isDailyNoteDateInSyncWindow('not-a-daily-note', sevenDayCutoff), false);
  assert.equal(
    isDailyNoteDateInSyncWindow('day-2000-01-01T00:00:00+08:00', 0),
    true,
    'zero days must retain unlimited-history behavior',
  );

  console.log('Daily Note deduplication tests passed');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
