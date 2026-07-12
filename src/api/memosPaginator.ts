import { moment } from 'obsidian';
import { Memo, MemosPaginator, APIClient, Resource } from '../types';
import { transformMemoToMarkdown } from '../utils/memoTransformer';

const PAGE_SIZE = 200;
const MAX_PAGES = 200;

function extractTimestamp(memo: Memo): number | null {
  if (typeof memo.timestamp === 'number') return memo.timestamp;
  if (typeof memo.createdTs === 'number') return memo.createdTs;
  if (memo.createTime) {
    const m = moment(memo.createTime);
    return m.isValid() ? m.unix() : null;
  }
  if (memo.createdAt) {
    const m = moment(memo.createdAt);
    return m.isValid() ? m.unix() : null;
  }
  return null;
}

export class SimpleMemosPaginator implements MemosPaginator {
  constructor(
    private client: APIClient,
    private lastTime: string,
    private useCalloutFormat: boolean,
    private useListCalloutFormat: boolean,
    private skipImages: boolean,
    private syncDaysLimit: number,
    private onResources?: (resources: Resource[]) => Promise<void>,
  ) {}

  async foreach(handler: (dayData: [string, Record<string, string>]) => Promise<void>): Promise<string> {
    const dailyMemosByDay: Record<string, Record<string, string>> = {};
    let latestTimestamp = '';

    const cutoffTimestamp = this.syncDaysLimit > 0
      ? moment().subtract(this.syncDaysLimit, 'days').startOf('day').unix()
      : 0;
    const lastTimestamp = this.lastTime ? parseInt(this.lastTime) : 0;

    let pageToken = '';
    let pages = 0;
    let exhausted = false;

    while (!exhausted) {
      // Memos v0.21 does not support the modern created_ts CEL filter. Fetch
      // legacy pages and apply the time-window and incremental filters below.
      const page = await this.client.listMemos({ pageSize: PAGE_SIZE, pageToken });
      pages += 1;

      for (const memo of page.memos) {
        try {
          const timestamp = extractTimestamp(memo);
          if (timestamp === null) {
            console.warn('Memo missing time fields:', memo);
            continue;
          }

          if (cutoffTimestamp > 0 && timestamp < cutoffTimestamp) continue;
          if (lastTimestamp > 0 && timestamp <= lastTimestamp) continue;

          const allResources = memo.attachments || memo.resourceList || memo.resources || [];
          const resourcesToDownload = this.skipImages
            ? allResources.filter(resource => !resource.type?.includes('image'))
            : allResources;
          if (this.onResources && resourcesToDownload.length > 0) {
            await this.onResources(resourcesToDownload);
          }

          const dailyMemo = transformMemoToMarkdown(
            {
              timestamp,
              content: memo.content,
              resources: allResources,
            },
            this.useCalloutFormat,
            this.useListCalloutFormat,
            this.skipImages,
          );

          if (!dailyMemosByDay[dailyMemo.date]) dailyMemosByDay[dailyMemo.date] = {};
          dailyMemosByDay[dailyMemo.date][dailyMemo.timestamp] = dailyMemo.content;

          if (!latestTimestamp || timestamp > parseInt(latestTimestamp)) {
            latestTimestamp = String(timestamp);
          }
        } catch (error) {
          console.warn('Failed to process memo:', memo, error);
        }
      }

      if (!page.nextPageToken) {
        exhausted = true;
      } else if (pages > MAX_PAGES) {
        console.warn(`Stopping after ${pages} pages to avoid runaway pagination`);
        exhausted = true;
      } else {
        pageToken = page.nextPageToken;
      }
    }

    for (const [date, dayMemos] of Object.entries(dailyMemosByDay)) {
      await handler([date, dayMemos]);
    }

    return latestTimestamp || this.lastTime;
  }
}
