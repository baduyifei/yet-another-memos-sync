import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yams-dedup-'));
const bundlePath = path.join(temporaryDirectory, 'daily-note-modifier.mjs');
const identityBundlePath = path.join(temporaryDirectory, 'memo-identity.mjs');

try {
  await build({
    entryPoints: {
      'daily-note-modifier': 'src/utils/dailyNoteModifier.ts',
      'memo-identity': 'src/utils/memoIdentity.ts',
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

  console.log('Daily Note deduplication tests passed');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
