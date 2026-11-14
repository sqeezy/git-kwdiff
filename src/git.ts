// The seam the UI talks to. `tauriGit` is the real one; `mockGit` is what the
// browser dev server and the tests run against, with the same shapes.
import type { Commit, FilePatch, Ref, Repo, RootOf, SearchArgs } from './types'

export type GitApi = Readonly<{
  openRepo: (path: string) => Promise<Repo>
  refs: (repo: string) => Promise<ReadonlyArray<Ref>>
  search: (args: SearchArgs) => Promise<ReadonlyArray<Commit>>
  cancelSearch: (id: number) => Promise<void>
  files: (shas: ReadonlyArray<string>) => Promise<ReadonlyArray<FilePatch>>
  patch: (shas: ReadonlyArray<string>, path: string) => Promise<string>
  roots: (shas: ReadonlyArray<string>) => Promise<ReadonlyArray<RootOf>>
}>

export const isTauri = (): boolean =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
