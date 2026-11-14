import { invoke } from '@tauri-apps/api/core'

import type { GitApi } from './git'
import type { Commit, Config, FilePatch, Ref, Repo, RootOf, SearchArgs } from './types'

// Bytes come back as an ArrayBuffer from `ipc::Response`; everything else is
// JSON. Errors arrive as { kind, message } and stay that shape.
const decode = (bytes: ArrayBuffer | Uint8Array | string): string =>
  typeof bytes === 'string' ? bytes : new TextDecoder().decode(bytes)

export const tauriGit: GitApi = {
  openRepo: (path: string) => invoke<Repo>('open_repo', { path }),

  refs: (repo: string) => invoke<ReadonlyArray<Ref>>('refs', { repo }),

  search: (args: SearchArgs) => invoke<ReadonlyArray<Commit>>('search', { ...args }),

  cancelSearch: (id: number) => invoke<null>('cancel_search', { id }).then(() => undefined),

  files: (shas: ReadonlyArray<string>) => invoke<ReadonlyArray<FilePatch>>('files', { shas }),

  patch: (shas: ReadonlyArray<string>, path: string) =>
    invoke<ArrayBuffer>('patch', { shas, path }).then(decode),

  roots: (shas: ReadonlyArray<string>) => invoke<ReadonlyArray<RootOf>>('roots', { shas }),
}

export const tauriConfig = {
  load: () => invoke<Config>('load_config'),
  save: (config: Config) => invoke<null>('save_config', { config }).then(() => undefined),
}
