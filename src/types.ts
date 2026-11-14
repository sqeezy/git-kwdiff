export type Commit = Readonly<{
  sha: string
  date: string
  author: string
  subject: string
}>

export type FilePatch = Readonly<{
  path: string
  added: number
  removed: number
  isNew: boolean
}>

export type RootOf = Readonly<{ sha: string; root: string }>

export type Ref = Readonly<{ name: string; kind: 'local' | 'remote' | 'tag' }>

export type Repo = Readonly<{ name: string; root: string }>

export type GitErrorKind = 'git-missing' | 'not-a-repo' | 'search' | 'io'

export type GitError = Readonly<{ kind: GitErrorKind; message: string }>

export type SearchArgs = Readonly<{
  id: number
  repo: string
  keyword: string
  code: boolean
  branch: string | null
}>

export type RepoBranch = Readonly<{ root: string; branch: string }>

export type Config = Readonly<{
  recents: ReadonlyArray<string>
  last: string | null
  branches: ReadonlyArray<RepoBranch>
}>
