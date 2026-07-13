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
      profile.syncDaysLimit,
      async resources => downloader.downloadAll(resources),
    );

    const newLastTime = await this.processMemos(paginator, profile, isIncrementalSync);
    if (newLastTime && newLastTime !== lastTime) {
      await this.state.setLastSync(profile.id, newLastTime);
    }
  }

  private async processMemos(
    paginator: SimpleMemosPaginator,
    profile: MemosProfile,
    isIncrementalSync: boolean,
  ): Promise<string> {
    const modifier = new DailyNoteModifier(profile.dailyMemoHeader);
    const blockIdLocations = await this.buildBlockIdLocations();
    let lastTime = '';

    await paginator.foreach(async ([dateStr, memos]) => {
      try {
        const momentDay = moment(dateStr);
        if (!momentDay.isValid()) {
          console.warn(`Invalid date: ${dateStr}`);
          return;
        }

        const dailyNote = await this.getOrCreateDailyNote(momentDay);
        if (!dailyNote) {
          console.warn(`Could not create daily note for ${dateStr}`);
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
        await this.removeMemoRecordsFromOtherNotes(
          memos,
          dailyNote.path,
          blockIdLocations,
          modifier,
        );

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
        console.error(`Failed to process memos for ${dateStr}:`, error);
      }
    });

    return lastTime;
  }

  private async removeMemoRecordsFromOtherNotes(
    memos: Record<string, string>,
    targetPath: string,
    locations: Map<string, Set<string>>,
    modifier: DailyNoteModifier,
  ): Promise<void> {
    const removalsByPath = new Map<string, Set<string>>();

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
        console.warn(`Failed to move Memos out of ${sourcePath}:`, error);
      }
    }
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
