import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Commit, FilePatch } from './model'

export const Message = defineMessageUnion({
  // repository
  PickedRepo: { path: Schema.String },
  OpenedRepo: { name: Schema.String, root: Schema.String },
  FailedOpen: { message: Schema.String },
  SucceededRefs: { refs: Schema.Array(Schema.Struct({ name: Schema.String, kind: Schema.Literals(['local', 'remote', 'tag']) })) },

  // search
  ChangedKeyword: { value: Schema.String },
  ToggledCode: {},
  SelectedBranch: { branch: Schema.NullOr(Schema.String) },
  SearchRequested: {
    id: Schema.Number,
    keyword: Schema.String,
    code: Schema.Boolean,
    branch: Schema.NullOr(Schema.String),
  },
  SucceededSearch: { id: Schema.Number, commits: Schema.Array(Commit) },
  FailedSearch: { id: Schema.Number, message: Schema.String },

  // selection
  ToggledCommit: { sha: Schema.String },
  ToggledAll: { on: Schema.Boolean },
  MovedCursor: { delta: Schema.Number },
  SelectedFile: { index: Schema.Number },
  SucceededFiles: { files: Schema.Array(FilePatch) },
  SucceededPatch: { id: Schema.Number, patch: Schema.String },

  // chrome
  PressedSpace: {},
  FocusedSearch: {},
})
export type Message = typeof Message.Type
