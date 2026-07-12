import { App, normalizePath, requestUrl } from 'obsidian';
import { Resource } from '../types';
import { generateResourceName } from '../utils/memoTransformer';

/**
 * Downloads Memos v0.21 resources into the Obsidian vault.
 * Internal resources use /o/r/{uid}; external resources are copied locally too.
 */
export class MemosResourceDownloader {
  private readonly baseURL: string;
  private readonly attachmentFolderPath: string;

  constructor(
    private readonly app: App,
    baseURL: string,
    private readonly token: string,
    attachmentFolderPath: string,
  ) {
    this.baseURL = baseURL.replace(/\/$/, '');
    this.attachmentFolderPath = normalizePath(attachmentFolderPath.trim() || 'Attachments');
  }

  async downloadAll(resources: Resource[]): Promise<void> {
    if (resources.length === 0) return;

    await this.ensureFolder(this.attachmentFolderPath);
    for (const resource of resources) {
      try {
        await this.download(resource);
      } catch (error) {
        console.warn(`Failed to download Memos resource ${String(resource.id ?? resource.uid ?? '')}:`, error);
      }
    }
  }

  private async download(resource: Resource): Promise<void> {
    const filename = generateResourceName(resource);
    const targetPath = normalizePath(`${this.attachmentFolderPath}/${filename}`);

    if (await this.app.vault.adapter.exists(targetPath)) {
      resource.localPath = targetPath;
      return;
    }

    const isExternal = Boolean(resource.externalLink);
    if (!isExternal && !resource.uid) {
      throw new Error('Resource has neither externalLink nor uid');
    }

    const url = isExternal
      ? resource.externalLink as string
      : `${this.baseURL}/o/r/${encodeURIComponent(resource.uid as string)}`;
    const response = await requestUrl({
      url,
      method: 'GET',
      // Never forward the private Memos token to a third-party external URL.
      headers: isExternal ? undefined : { 'Authorization': `Bearer ${this.token}` },
      throw: false,
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`HTTP ${response.status} while downloading ${url}`);
    }

    await this.app.vault.adapter.writeBinary(targetPath, response.arrayBuffer);
    resource.localPath = targetPath;
  }

  private async ensureFolder(folderPath: string): Promise<void> {
    const parts = folderPath.split('/').filter(Boolean);
    let current = '';
    for (const part of parts) {
      current = normalizePath(current ? `${current}/${part}` : part);
      if (!(await this.app.vault.adapter.exists(current))) {
        await this.app.vault.adapter.mkdir(current);
      }
    }
  }
}
