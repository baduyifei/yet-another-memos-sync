import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'yams-dedup-'));
const bundlePath = path.join(temporaryDirectory, 'daily-note-modifier.mjs');

try {
  await build({
    entryPoints: ['src/utils/dailyNoteModifier.ts'],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: bundlePath,
  });

  const { DailyNoteModifier } = await import(pathToFileURL(bundlePath).href);
  const modifier = new DailyNoteModifier("## Today's Memos");
  const timestamp = '1783037940';
  const remoteMemo = `> [!info] 08:19\n> Remote edit\n>\n> ^${timestamp}`;
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
    { [timestamp]: remoteMemo },
    false,
  );

  assert.ok(repaired, 'a duplicated note should be repaired');
  assert.equal((repaired.match(/\^1783037940\b/g) ?? []).length, 1);
  assert.equal((repaired.match(/^## Today.s Memos$/gm) ?? []).length, 1);
  assert.match(repaired, /First local backup/);
  assert.doesNotMatch(repaired, /Duplicate backup|Remote edit/);

  assert.equal(
    modifier.modifyDailyNote(repaired, '2026-07-03', { [timestamp]: remoteMemo }, false),
    undefined,
    'repeating force sync must be idempotent',
  );

  const existingElsewhere = `# Note\n\n## Archive\n\n${remoteMemo}\n`;
  assert.equal(
    modifier.modifyDailyNote(existingElsewhere, '2026-07-03', { [timestamp]: remoteMemo }, false),
    undefined,
    'an ID elsewhere in the Daily Note must block a duplicate insert',
  );

  const firstBackup = modifier.modifyDailyNote('# Note\n', '2026-07-03', { [timestamp]: remoteMemo }, false);
  assert.ok(firstBackup);
  assert.equal((firstBackup.match(/\^1783037940\b/g) ?? []).length, 1);

  console.log('Daily Note deduplication tests passed');
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}
