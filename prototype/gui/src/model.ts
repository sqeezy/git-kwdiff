import { Schema } from 'effect'

export const Variant = Schema.Literals(['A', 'B', 'C'])
export type Variant = typeof Variant.Type

export const Model = Schema.Struct({
  keyword: Schema.String,
  selectedShas: Schema.Array(Schema.String),
  variant: Variant,
  step: Schema.Number,
  fileIndex: Schema.Number,
  showState: Schema.Boolean,
})
export type Model = typeof Model.Type
