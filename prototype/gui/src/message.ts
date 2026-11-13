import { Schema } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { Variant } from './model'

// PROTOTYPE — a GUI for git-kwdiff. Throwaway code, not production.
// Facts only: what happened, never what to do about it.
export const Message = defineMessageUnion({
  ChangedKeyword: { value: Schema.String },
  ToggledCommit: { sha: Schema.String },
  ToggledAll: { on: Schema.Boolean },
  SelectedFile: { index: Schema.Number },
  MovedStep: { step: Schema.Number },
  SelectedVariant: { variant: Variant },
  UriReplaced: { search: Schema.String },
  PressedNextVariant: {},
  PressedPrevVariant: {},
  ToggledState: {},
})
export type Message = typeof Message.Type
