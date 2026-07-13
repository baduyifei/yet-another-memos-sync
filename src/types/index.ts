// Core types for Memos API (v0.22+ uses /api/v1; older `createdTs` kept for compat)
export interface Memo {
  id?: number | string;
  name?: string;
  uid?: string;
  content: string;
  timestamp?: number;
  createdTs?: number;
  createdAt?: string;
  createTime?: string;
  attachments?: Resource[];
  resourceList?: Resource[];
  resources?: Resource[];
}

export interface Resource {
  id?: number | string;
  name?: string;
  filename?: string;
  type?: string;
  size?: number;
  externalLink?: string;
  uid?: string;
  localPath?: string;
}

export interface DailyMemo {
  date: string;
  timestamp: number;
  recordKey: string;
  content: string;
}

export interface MemosProfile {
  id: string;
  name: string;
  apiUrl: string;
  apiToken: string;
  dailyMemoHeader: string;
  syncDaysLimit: number;
  enabled: boolean;
}

export interface MemosSettings {
  // Profiles - one per memos account/instance
  profiles: MemosProfile[];

  // Shared formatting settings
  attachmentFolderPath: string;
  createMissingDailyNotes: boolean;
  useCalloutFormat: boolean;
  useListCalloutFormat: boolean;
  skipImages: boolean;

  // Auto sync
  enableAutoSyncOnStartup: boolean;
  startupSyncDelay: number;
  skipIfSyncedToday: boolean;
  periodicSyncInterval: number;

  // Persisted sync state (per profile id -> latest synced unix seconds)
  lastSyncByProfile: Record<string, string>;
  lastSyncDate: string;
}

export interface ListMemosPage {
  memos: Memo[];
  nextPageToken: string;
}

export interface ListMemosOptions {
  pageSize?: number;
  pageToken?: string;
  filter?: string;
}

export interface APIClient {
  listMemos(opts?: ListMemosOptions): Promise<ListMemosPage>;
}

export interface MemosPaginationResult {
  latestTimestamp: string;
  recordKeys: Set<string>;
  complete: boolean;
  cutoffTimestamp: number;
}

export interface MemosPaginator {
  foreach(handler: (dayData: [string, Record<string, string>]) => Promise<void>): Promise<MemosPaginationResult>;
}
