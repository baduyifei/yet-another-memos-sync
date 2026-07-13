import { App, TFile, moment } from 'obsidian';
import { getDailyNote, createDailyNote, getAllDailyNotes } from 'obsidian-daily-notes-interface';

type MomentInstance = ReturnType<typeof moment>;
import { MemosAPIClient } from '../api/memosClient';
import { SimpleMemosPaginator } from '../api/memosPaginator';
import { DailyNoteModifier, extractMemoBlockIds } from '../utils/dailyNoteModifier';
import { MemosProfile, MemosSettings } from '../types';
import { MemosResourceDownloader } from './resourceDownloader';
import { parseMemoRecordKey } from '../utils/memoIdentity';

export interface SyncStateStore {
  getLastSync(profileId: string): string;
  setLastSync(profileId: string, value: string): Promise<void>;
  markSyncedToday(): Promise<void>;
}

export type SyncMode = 'smart' | 'incremental' | 'force';

export class DailyNoteManager {
  constructor(
    private app: App,
    private settings: MemosSettings,
    private state: SyncStateStore,
  ) {}

  updateSettings(settings: MemosSettings): void {
    this.settings = settings;
  }

  async syncAll(mode: SyncMode): Promise<void> {
    const profiles = (this.settings.profiles || []).filter(p => p.enabled && p.apiUrl && p.apiToken);
    if (profiles.length === 0) {
      console.warn('No enabled profiles configured');
      return;
    }
    for (const profile of profiles) {
      try {
        await this.syncProfile(profile, mode);
      } catch (error) {
        console.error(`Sync failed for profile "${profile.name}":`, error);
        throw error;
      }
    }
    await this.state.markSyncedToday();
  }

  private async syncProfile(profile: MemosProfile, mode: SyncMode): Promise<void> {
    const client = new MemosAPIClient(profile.apiUrl, profile.apiToken);
    const downloader = new MemosResourceDownloader(
      this.app,
      profile.apiUrl,
      profile.apiToken,
      this.settings.attachmentFolderPath,
    );
    const lastTime = this.state.getLastSync(profile.id);

    let effectiveLastTime: string;
    let isIncrementalSync: boolean;
    const forceFullSnapshot = mode === 'force';
    const deletionReconciliation = forceFullSnapshot && this.hasUniqueManagedHeader(profile);
    if (forceFullSnapshot && !deletionReconciliation) {
      console.warn(
        `Deletion reconciliation disabled for profile "${profile.name}" because another enabled profile uses the same Daily Memo heading`,
      );
    }

    if (mode === 'force') {
      effectiveLastTime = '';
      isIncrementalSync = false;
    } else if (mode === 'incremental') {
      effectiveLastTime = lastTime;
      isIncrementalSync = true;
    } else {
      // smart: full sync if never synced before, otherwise incremental
      if (!lastTime) {
        effectiveLastTime = '';
        isIncrementalSync = false;
      } else {
        effectiveLastTime = lastTime;
        isIncrementalSync = true;
      }
    }

    const paginator = new SimpleMemosPaginator(
      client,
      effectiveLastTime,
      this.settings.useCalloutFormat,
      this.settings.useListCalloutFormat,
      this.settings.skipImages,
      forceFullSnapshot ? 0 : profile.syncDaysLimit,
      async resources => downloader.downloadAll(resources),
    );

    const newLastTime = await this.processMemos(
      paginator,
      profile,
      isIncrementalSync,
      deletionReconciliation,
    );
    if (newLastTime && newLastTime !== lastTime) {
      await this.state.setLastSync(profile.id, newLastTime);
    }
  }

  private hasUniqueManagedHeader(profile: MemosProfile): boolean {
    const normalizedHeader = profile.dailyMemoHeader
      .replace(/[\u2018\u2019\u02bc]/g, "'")
      .replace(/[ \t]+/g, ' ')
      .trim()
      .toLocaleLowerCase();
    return (this.settings.profiles || [])
      .filter(candidate => candidate.enabled)
      .filter(candidate => candidate.dailyMemoHeader
        .replace(/[\u2018\u2019\u02bc]/g, "'")
        .replace(/[ \t]+/g, ' ')
        .trim()
        .toLocaleLowerCase() === normalizedHeader)
      .length === 1;
  }

  private async processMemos(
    paginator: SimpleMemosPaginator,
    profile: MemosProfile,
    isIncrementalSync: boolean,
    deletionReconciliation: boolean,
  ): Promise<string> {
    const modifier = new DailyNoteModifier(profile.dailyMemoHeader);
    const blockIdLocations = await this.buildBlockIdLocations();
    let lastTime = '';
    let localSyncComplete = true;

    const paginationResult = await paginator.foreach(async ([dateStr, memos]) => {
      try {
        const momentDay = moment(dateStr);
        if (!momentDay.isValid()) {
          console.warn(`Invalid date: ${dateStr}`);
          localSyncComplete = false;
          return;
        }

        const dailyNote = await this.getOrCreateDailyNote(momentDay);
        if (!dailyNote) {
          console.warn(`Could not create daily note for ${dateStr}`);
          localSyncComplete = false;
          return;
        }

        const currentContent = await this.app.vault.read(dailyNote);
        const modifiedContent = modifier.modifyDailyNote(
          currentContent,
          dateStr,
          memos,
          isIncrementalSync,
        );

        if (modifiedContent && modifiedContent !== currentContent) {
          await this.app.vault.modify(dailyNote, modifiedContent);
          this.updateBlockIdLocations(blockIdLocations, dailyNote.path, modifiedContent);
        }

        // Move semantics are copy-then-delete: only remove old-date records
        // after the target Daily Note has been written successfully.
        const moveComplete = await this.removeMemoRecordsFromOtherNotes(
          memos,
          dailyNote.path,
          blockIdLocations,
          modifier,
        );
        if (!moveComplete) localSyncComplete = false;

        const timestamps = Object.keys(memos)
          .map(recordKey => parseMemoRecordKey(recordKey).timestamp)
          .filter(timestamp => timestamp > 0);
        if (timestamps.length > 0) {
          const latest = Math.max(...timestamps).toString();
          if (!lastTime || parseInt(latest) > parseInt(lastTime)) {
            lastTime = latest;
          }
        }
      } catch (error) {
        localSyncComplete = false;
        console.error(`Failed to process memos for ${dateStr}:`, error);
      }
    });

    if (deletionReconciliation) {
      if (paginationResult.complete && localSyncComplete) {
        const reconciliationComplete = await this.reconcileDeletedMemos(
          modifier,
          paginationResult.recordKeys,
          blockIdLocations,
        );
        if (!reconciliationComplete) {
          console.warn('Remote deletion reconciliation finished with local file errors');
        }
      } else {
        console.warn(
          'Skipping remote deletion reconciliation because the remote snapshot or local sync was incomplete',
        );
      }
    }

    return paginationResult.latestTimestamp || lastTime;
  }

  private async removeMemoRecordsFromOtherNotes(
    memos: Record<string, string>,
    targetPath: string,
    locations: Map<string, Set<string>>,
    modifier: DailyNoteModifier,
  ): Promise<boolean> {
    const removalsByPath = new Map<string, Set<string>>();
    let complete = true;

    for (const recordKey of Object.keys(memos)) {
      const identity = parseMemoRecordKey(recordKey);
      const aliases = [identity.blockId, identity.legacyTimestampId, identity.legacyDatabaseId]
        .filter((alias, index, values) => Boolean(alias) && values.indexOf(alias) === index);

      for (const alias of aliases) {
        for (const path of locations.get(alias) ?? []) {
          if (path === targetPath) continue;
          const ids = removalsByPath.get(path) ?? new Set<string>();
          for (const identityAlias of aliases) ids.add(identityAlias);
          removalsByPath.set(path, ids);
        }
      }
    }

    for (const [sourcePath, idsToRemove] of removalsByPath) {
      const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
      if (!(sourceFile instanceof TFile)) continue;

      try {
        const sourceContent = await this.app.vault.read(sourceFile);
        const modifiedSource = modifier.removeMemoRecords(sourceContent, idsToRemove);
        if (modifiedSource && modifiedSource !== sourceContent) {
          await this.app.vault.modify(sourceFile, modifiedSource);
          this.updateBlockIdLocations(locations, sourcePath, modifiedSource);
        }
      } catch (error) {
        complete = false;
        console.warn(`Failed to move Memos out of ${sourcePath}:`, error);
      }
    }

    return complete;
  }

  /**
   * Reconcile the plugin-managed Memos sections against a complete remote
   * snapshot. This is intentionally called only by force sync after every
   * remote page and local upsert/move has completed successfully.
   */
  private async reconcileDeletedMemos(
    modifier: DailyNoteModifier,
    remoteRecordKeys: Set<string>,
    locations: Map<string, Set<string>>,
  ): Promise<boolean> {
    const remoteIds = new Set(
      Array.from(remoteRecordKeys, recordKey => parseMemoRecordKey(recordKey).blockId),
    );
    const dailyNotes = Object.values(getAllDailyNotes())
      .map(file => this.app.vault.getAbstractFileByPath(file.path))
      .filter((file): file is TFile => file instanceof TFile);
    let complete = true;

    for (const dailyNote of dailyNotes) {
      try {
        const content = await this.app.vault.read(dailyNote);
        const staleIds = new Set(
          Array.from(modifier.getManagedMemoIds(content)).filter(id => !remoteIds.has(id)),
        );
        if (staleIds.size === 0) continue;

        const modifiedContent = modifier.removeMemoRecords(content, staleIds);
        if (modifiedContent && modifiedContent !== content) {
          await this.app.vault.modify(dailyNote, modifiedContent);
          this.updateBlockIdLocations(locations, dailyNote.path, modifiedContent);
        }
      } catch (error) {
        complete = false;
        console.warn(`Failed to reconcile deleted Memos in ${dailyNote.path}:`, error);
      }
    }

    return complete;
  }

  private async buildBlockIdLocations(): Promise<Map<string, Set<string>>> {
    const locations = new Map<string, Set<string>>();
    const dailyNotes = Object.values(getAllDailyNotes())
      .map(file => this.app.vault.getAbstractFileByPath(file.path))
      .filter((file): file is TFile => file instanceof TFile);

    for (const dailyNote of dailyNotes) {
      try {
        const content = await this.app.vault.cachedRead(dailyNote);
        for (const blockId of extractMemoBlockIds(content)) {
          const paths = locations.get(blockId) ?? new Set<string>();
          paths.add(dailyNote.path);
          locations.set(blockId, paths);
        }
      } catch (error) {
        console.warn(`Failed to index block IDs in ${dailyNote.path}:`, error);
      }
    }

    return locations;
  }

  private updateBlockIdLocations(
    locations: Map<string, Set<string>>,
    filePath: string,
    content: string,
  ): void {
    for (const [blockId, paths] of locations) {
      paths.delete(filePath);
      if (paths.size === 0) locations.delete(blockId);
    }
    for (const blockId of extractMemoBlockIds(content)) {
      const paths = locations.get(blockId) ?? new Set<string>();
      paths.add(filePath);
      locations.set(blockId, paths);
    }
  }

  private async getOrCreateDailyNote(momentDay: MomentInstance): Promise<TFile | null> {
    try {
      // obsidian-daily-notes-interface bundles its own (older) obsidian.d.ts,
      // so use instanceof to narrow against the project's TFile class.
      const existing = getDailyNote(momentDay, getAllDailyNotes());
      if (existing instanceof TFile) {
        return existing;
      }
      if (this.settings.createMissingDailyNotes) {
        const created = await createDailyNote(momentDay);
        if (created instanceof TFile) {
          return created;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get/create daily note:', error);
      return null;
    }
  }
}
