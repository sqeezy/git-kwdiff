import { Schema } from 'effect'

export const Repo = Schema.Struct({ name: Schema.String, root: Schema.String })
export const Ref = Schema.Struct({
  name: Schema.String,
  kind: Schema.Literals(['local', 'remote', 'tag']),
})
export const Commit = Schema.Struct({
  sha: Schema.String,
  date: Schema.String,
  author: Schema.String,
  subject: Schema.String,
})
export const FilePatch = Schema.Struct({
  path: Schema.String,
  added: Schema.Number,
  removed: Schema.Number,
  isNew: Schema.Boolean,
})
export const GitError = Schema.Struct({
  kind: Schema.Literals(['git-missing', 'not-a-repo', 'search', 'io']),
  message: Schema.String,
})

export const Model = Schema.Struct({
  repo: Schema.NullOr(Repo),
  recents: Schema.Array(Repo),
  refs: Schema.Array(Ref),
  branch: Schema.NullOr(Schema.String),
  keyword: Schema.String,
  code: Schema.Boolean,
  commits: Schema.Array(Commit),
  selectedShas: Schema.Array(Schema.String),
  cursor: Schema.Number,
  files: Schema.Array(FilePatch),
  fileIndex: Schema.Number,
  patch: Schema.NullOr(Schema.String),
  searching: Schema.Boolean,
  searchId: Schema.Number,
  patchId: Schema.Number,
  error: Schema.NullOr(GitError),
})
export type Model = typeof Model.Type
