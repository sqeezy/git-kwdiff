// PROTOTYPE — the whole state machine. Model, facts, transitions. Effects are
// described as Commands and performed by the runtime, never by the view.
import { Effect, Schema } from 'effect'
import { Command, Runtime, Subscription, type Update } from 'foldkit'
import { streamFromKeyBindings } from 'foldkit/dom'
import { modifyFields } from 'foldkit/struct'

import { commits } from './data'
import { matching } from './lib'
import { Message } from './message'
import type { Model } from './model'

const VARIANTS = ['A', 'B', 'C'] as const
const variantName = { A: 'Workbench', B: 'Review IDE', C: 'Review flow' } as const

// The URL stays in step with the model so a variant is shareable and survives
// a reload. This is the only effect in the prototype.
const ReplaceUrl = Command.define('ReplaceUrl', {
  args: { search: Schema.String },
  messages: [Message.UriReplaced],
  execute: ({ search }) =>
    Effect.sync(() => {
      const url = new URL(globalThis.location.href)
      url.search = search
      globalThis.history.replaceState(null, '', url)
    }).pipe(Effect.as(Message.UriReplaced({ search }))),
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedKeyword: ({ value }) => ({ model: modifyFields(model, { keyword: () => value }) }),

    ToggledCommit: ({ sha }) => ({
      model: modifyFields(model, {
        selectedShas: shas =>
          shas.includes(sha) ? shas.filter(other => other !== sha) : [...shas, sha],
      }),
    }),

    ToggledAll: ({ on }) => ({
      model: modifyFields(model, {
        selectedShas: () => (on ? matching(model.keyword).map(commit => commit.sha) : []),
      }),
    }),

    SelectedFile: ({ index }) => ({ model: modifyFields(model, { fileIndex: () => index }) }),

    MovedStep: ({ step }) => ({ model: modifyFields(model, { step: () => step }) }),

    SelectedVariant: ({ variant }) => ({
      model: modifyFields(model, { variant: () => variant }),
      commands: [ReplaceUrl({ search: `?variant=${variant}` })],
    }),

    PressedNextVariant: () => {
      const index = VARIANTS.indexOf(model.variant)
      const variant = VARIANTS[(index + 1) % VARIANTS.length] ?? 'A'
      return {
        model: modifyFields(model, { variant: () => variant }),
        commands: [ReplaceUrl({ search: `?variant=${variant}` })],
      }
    },

    PressedPrevVariant: () => {
      const index = VARIANTS.indexOf(model.variant)
      const variant = VARIANTS[(index + VARIANTS.length - 1) % VARIANTS.length] ?? 'A'
      return {
        model: modifyFields(model, { variant: () => variant }),
        commands: [ReplaceUrl({ search: `?variant=${variant}` })],
      }
    },

    UriReplaced: () => ({ model }),

    ToggledState: () => ({ model: modifyFields(model, { showState: () => !model.showState }) }),
  })

export const init: Runtime.ApplicationInit<Model, Message> = () => {
  const raw = new URLSearchParams(globalThis.location.search).get('variant')
  const variant = raw === 'B' || raw === 'C' ? raw : 'A'
  const keyword = 'ABC-123'
  return {
    model: {
      keyword,
      selectedShas: commits
        .filter(commit => commit.subject.toLowerCase().includes(keyword.toLowerCase()))
        .map(commit => commit.sha),
      variant,
      step: 1,
      fileIndex: 0,
      showState: false,
    },
  }
}

// Arrow keys cycle the prototype variants. Suppressed while typing by default.
export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  variantKeys: Subscription.persistentEntry(
    streamFromKeyBindings<Message>({
      bindings: [
        { keys: 'ArrowRight', mapEvent: () => Message.PressedNextVariant() },
        { keys: 'ArrowLeft', mapEvent: () => Message.PressedPrevVariant() },
      ],
    }),
  ),
}))

export { variantName }
