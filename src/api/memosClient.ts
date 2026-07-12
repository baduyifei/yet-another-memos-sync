import { requestUrl, RequestUrlResponse } from 'obsidian';
import { APIClient, ListMemosOptions, ListMemosPage, Memo } from '../types';
import { t } from '../i18n/translationManager';

interface LegacyListMemosResponse {
  data?: Memo[];
}

/**
 * HTTP client for the Memos v0.21.x /api/v1/memo endpoint.
 *
 * Memos v0.21 uses limit/offset pagination and returns a JSON array. Newer
 * Memos versions use /api/v1/memos, page tokens, CEL filters and an object
 * response. This client adapts the legacy response to the plugin's internal
 * ListMemosPage shape so the rest of the sync pipeline can stay unchanged.
 * Uses Obsidian's requestUrl so it works on both desktop and mobile.
 */
export class MemosAPIClient implements APIClient {
  private baseURL: string;
  private token: string;

  constructor(baseURL: string, token: string) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.token = token;
  }

  async listMemos(opts: ListMemosOptions = {}): Promise<ListMemosPage> {
    const pageSize = opts.pageSize ?? 100;
    const parsedOffset = Number.parseInt(opts.pageToken ?? '0', 10);
    const offset = Number.isFinite(parsedOffset) && parsedOffset >= 0 ? parsedOffset : 0;
    const params = new URLSearchParams();
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));

    const url = `${this.baseURL}/api/v1/memo?${params.toString()}`;

    let response: RequestUrlResponse;
    try {
      response = await requestUrl({
        url,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/json',
        },
        throw: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`${t.t('NETWORK_ERROR')} ${url}. ${message}`);
    }

    if (response.status < 200 || response.status >= 300) {
      const body = response.text || '';
      // Always log the full body so debugging is possible; only surface a short
      // summary in the thrown Error since it ends up in a user-facing Notice.
      console.error(`API request failed: ${response.status}`, body);
      const summary = body.replace(/\s+/g, ' ').trim().slice(0, 200);
      const detail = summary ? ` ${summary}${body.length > 200 ? '…' : ''}` : '';
      throw new Error(`${t.t('FETCH_MEMOS_ERROR')}: HTTP ${response.status}${detail}`);
    }

    const data = response.json as Memo[] | LegacyListMemosResponse;
    const memos = Array.isArray(data)
      ? data
      : Array.isArray(data.data)
        ? data.data
        : null;

    if (memos === null) {
      throw new Error(`${t.t('FETCH_MEMOS_ERROR')}: unexpected Memos v0.21 response format`);
    }

    return {
      memos,
      // A full page may have a following page. An exact multiple causes one
      // harmless final empty request, which then terminates pagination.
      nextPageToken: memos.length === pageSize ? String(offset + memos.length) : '',
    };
  }
}
