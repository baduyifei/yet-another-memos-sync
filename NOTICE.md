# Copyright and Attribution Notice

## Upstream project

This repository is a modified fork of:

- **Yet Another Memos Sync** by `exusiaiwei` and its contributors
- Upstream repository: https://github.com/exusiaiwei/yet-another-memos-sync
- Upstream version used as the base: `1.6.1`

The upstream project also credits `RyoJerryYu/obsidian-memos-sync`, Memos, Obsidian, and List Callouts. All upstream code and historical contributions remain copyright of their respective authors and contributors.

## Fork modifications

Copyright © 2026 baduyifei

The above copyright applies only to original modifications introduced in this fork, including:

1. Memos v0.21.x API route and response compatibility.
2. Legacy `limit` / `offset` pagination.
3. Client-side time-window and incremental filtering for servers without the modern CEL filter.
4. Legacy `createdTs` and `resourceList` handling.
5. Authenticated `/o/r/{resource.uid}` resource downloads.
6. Local image and attachment storage with vault-local Markdown links.
7. Protection against forwarding the private Memos token to external resource hosts.
8. Automatic insertion of a missing Memo heading in historical Daily Notes.
9. Documentation and troubleshooting guidance specific to this compatibility fork.

No exclusive ownership is claimed over upstream code or third-party projects, names, logos, or trademarks, including Memos and Obsidian.

## License

Use and distribution of this repository are governed by the existing `LICENSE` file. This notice supplements attribution and modification history; it does not replace or narrow the permissions in `LICENSE`.

