import { Effect, Schema } from 'effect'
import { Command, Subscription, type Update } from 'foldkit'
import { focus, streamFromKeyBindings } from 'foldkit/dom'
import { modifyFields } from 'foldkit/struct'

import { gitApi } from './api'
import { isTauri } from './git'
import { Message } from './message'
import type { Model } from './model'
import type { FilePatch, RootOf } from './types'

const DEBOUNCE = '250 millis'

// ---- commands --------------------------------------------------------------

const OpenRepo = Command.define('OpenRepo', {
  args: { path: Schema.String },
  messages: [Message.OpenedRepo, Message.FailedOpen],
  execute: ({ path }) =>
    Effect.tryPromise({ try: () => gitApi.openRepo(path), catch: error => String(error) }).pipe(
      Effect.map(repo => Message.OpenedRepo({ name: repo.name, root: repo.root })),
      Effect.catch(error => Effect.succeed(Message.FailedOpen({ message: String(error) }))),
    ),
})

const LoadRefs = Command.define('LoadRefs', {
  args: { repo: Schema.String },
  messages: [Message.SucceededRefs, Message.FailedOpen],
  execute: ({ repo }) =>
    Effect.tryPromise({ try: () => gitApi.refs(repo), catch: error => String(error) }).pipe(
      Effect.map(refs => Message.SucceededRefs({ refs: [...refs] })),
      Effect.catch(error => Effect.succeed(Message.FailedOpen({ message: String(error) }))),
    ),
})

// The debounce is a Command, not a timer in the view: it sleeps, then asks for
// a search. A keystroke bumps `searchId`, so a sleeping debounce wakes up as a
// stale id and is dropped in update.
export const DebouncedSearch = Command.define('DebouncedSearch', {
  args: {
    id: Schema.Number,
    keyword: Schema.String,
    code: Schema.Boolean,
    branch: Schema.NullOr(Schema.String),
  },
  messages: [Message.SearchRequested],
  execute: args => Effect.sleep(DEBOUNCE).pipe(Effect.as(Message.SearchRequested(args))),
})

const RunSearch = Command.define('RunSearch', {
  args: {
    id: Schema.Number,
    repo: Schema.String,
    keyword: Schema.String,
    code: Schema.Boolean,
    branch: Schema.NullOr(Schema.String),
  },
  messages: [Message.SucceededSearch, Message.FailedSearch],
  execute: args =>
    Effect.tryPromise({
      try: () =>
        gitApi.search({
          id: args.id,
          repo: args.repo,
          keyword: args.keyword,
          code: args.code,
          branch: args.branch,
        }),
      catch: error => String(error),
    }).pipe(
      Effect.map(commits => Message.SucceededSearch({ id: args.id, commits: [...commits] })),
      Effect.catch(error =>
        Effect.succeed(Message.FailedSearch({ id: args.id, message: String(error) })),
      ),
    ),
})

// One load per selection change: the file list and the roots travel together,
// so the pane can never show a file from one selection beside roots from another.
export const LoadSelection = Command.define('LoadSelection', {
  args: { shas: Schema.Array(Schema.String) },
  messages: [Message.SucceededSelection],
  execute: ({ shas }) =>
    Effect.gen(function* () {
      const files = yield* Effect.tryPromise({
        try: () => gitApi.files(shas),
        catch: () => [] as ReadonlyArray<FilePatch>,
      }).pipe(Effect.catch(() => Effect.succeed([] as ReadonlyArray<FilePatch>)))

      const roots = yield* Effect.tryPromise({
        try: () => gitApi.roots(shas),
        catch: () => [] as ReadonlyArray<RootOf>,
      }).pipe(Effect.catch(() => Effect.succeed([] as ReadonlyArray<RootOf>)))

      return Message.SucceededSelection({
        files: [...files],
        roots: [...new Set(roots.map(root => root.root))],
      })
    }),
})

export const LoadPatch = Command.define('LoadPatch', {
  args: { id: Schema.Number, shas: Schema.Array(Schema.String), path: Schema.String },
  messages: [Message.SucceededPatch],
  execute: ({ id, shas, path }) =>
    Effect.tryPromise({ try: () => gitApi.patch(shas, path), catch: error => String(error) }).pipe(
      Effect.map(patch => Message.SucceededPatch({ id, patch })),
      Effect.catch(() => Effect.succeed(Message.SucceededPatch({ id, patch: '' }))),
    ),
})

const FocusSearch = Command.define('FocusSearch', {
  messages: [Message.SearchFocused],
  execute: focus('#kw-search').pipe(
    Effect.as(Message.SearchFocused()),
    Effect.catch(() => Effect.succeed(Message.SearchFocused())),
  ),
})

const FocusDiff = Command.define('FocusDiff', {
  messages: [Message.DiffFocused],
  execute: focus('#diff-pane').pipe(
    Effect.as(Message.DiffFocused()),
    Effect.catch(() => Effect.succeed(Message.DiffFocused())),
  ),
})

const BlurActive = Command.define('BlurActive', {
  messages: [Message.Blurred],
  execute: Effect.sync(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) active.blur()
  }).pipe(Effect.as(Message.Blurred())),
})

// ---- update ----------------------------------------------------------------

const withSelection = (model: Model, selectedShas: ReadonlyArray<string>) => ({
  model: modifyFields(model, {
    selectedShas: () => [...selectedShas],
    patch: () => null,
    patchId: id => id + 1,
  }),
  commands: [LoadSelection({ shas: [...selectedShas] })],
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> =>
  Message.match<Update.Return<Model, Message>>(message, {
    PickedRepo: ({ path }) => ({ model, commands: [OpenRepo({ path })] }),

    OpenedRepo: ({ name, root }) => {
      const repo = { name, root }
      return {
        model: modifyFields(model, {
          repo: () => repo,
          recents: list => [repo, ...list.filter(r => r.root !== root)].slice(0, 10),
          error: () => null,
          commits: () => [],
          selectedShas: () => [],
          files: () => [],
          patch: () => null,
          roots: () => [],
        }),
        commands: [LoadRefs({ repo: root })],
      }
    },

    FailedOpen: ({ message }) => ({
      model: modifyFields(model, {
        error: () => ({ kind: 'not-a-repo' as const, message }),
      }),
    }),

    SucceededRefs: ({ refs }) => ({ model: modifyFields(model, { refs: () => [...refs] }) }),

    ChangedKeyword: ({ value }) => {
      const id = model.searchId + 1
      return {
        model: modifyFields(model, {
          keyword: () => value,
          searchId: () => id,
          searching: () => model.repo !== null,
          error: () => null,
        }),
        commands:
          model.repo === null
            ? []
            : [DebouncedSearch({ id, keyword: value, code: model.code, branch: model.branch })],
      }
    },

    ToggledCode: () => {
      const id = model.searchId + 1
      const code = !model.code
      return {
        model: modifyFields(model, {
          code: () => code,
          searchId: () => id,
          searching: () => model.repo !== null,
        }),
        commands:
          model.repo === null
            ? []
            : [DebouncedSearch({ id, keyword: model.keyword, code, branch: model.branch })],
      }
    },

    SelectedBranch: ({ branch }) => {
      const id = model.searchId + 1
      return {
        model: modifyFields(model, {
          branch: () => branch,
          searchId: () => id,
          searching: () => model.repo !== null,
        }),
        commands:
          model.repo === null
            ? []
            : [DebouncedSearch({ id, keyword: model.keyword, code: model.code, branch })],
      }
    },

    SearchRequested: ({ id, keyword, code, branch }) =>
      id === model.searchId && model.repo !== null
        ? {
            model,
            commands: [RunSearch({ id, repo: model.repo.root, keyword, code, branch })],
          }
        : { model },

    SucceededSearch: ({ id, commits }) =>
      id !== model.searchId
        ? { model }
        : {
            model: modifyFields(model, {
              commits: () => [...commits],
              searching: () => false,
              cursor: () => 0,
            }),
          },

    FailedSearch: ({ id, message }) =>
      id !== model.searchId
        ? { model }
        : {
            model: modifyFields(model, {
              searching: () => false,
              error: () => ({ kind: 'search' as const, message }),
            }),
          },

    ToggledCommit: ({ sha }) => {
      const selected = model.selectedShas.includes(sha)
        ? model.selectedShas.filter(other => other !== sha)
        : [...model.selectedShas, sha]
      return withSelection(model, selected)
    },

    ToggledAll: ({ on }) =>
      withSelection(model, on ? model.commits.map(commit => commit.sha) : []),

    MovedCursor: ({ delta }) => {
      const last = Math.max(0, model.commits.length - 1)
      const cursor = Math.min(last, Math.max(0, model.cursor + delta))
      return { model: modifyFields(model, { cursor: () => cursor }) }
    },

    SelectedFile: ({ index }) => {
      const file = model.files[index]
      if (file === undefined) return { model }
      const id = model.patchId + 1
      return {
        model: modifyFields(model, {
          fileIndex: () => index,
          patchId: () => id,
          patch: () => null,
        }),
        commands: [LoadPatch({ id, shas: [...model.selectedShas], path: file.path })],
      }
    },

    SucceededSelection: ({ files, roots }) => {
      const list = [...files]
      const rootList = [...new Set(roots)]
      if (list.length === 0) {
        return {
          model: modifyFields(model, {
            files: () => [],
            roots: () => rootList,
            patch: () => null,
            fileIndex: () => 0,
          }),
        }
      }
      const index = Math.min(model.fileIndex, list.length - 1)
      const file = list[index]
      if (file === undefined) {
        return { model: modifyFields(model, { files: () => list, roots: () => rootList }) }
      }
      const id = model.patchId + 1
      return {
        model: modifyFields(model, {
          files: () => list,
          roots: () => rootList,
          fileIndex: () => index,
          patchId: () => id,
        }),
        commands: [LoadPatch({ id, shas: [...model.selectedShas], path: file.path })],
      }
    },

    SucceededPatch: ({ id, patch }) =>
      id !== model.patchId ? { model } : { model: modifyFields(model, { patch: () => patch }) },

    PressedSpace: () => {
      const commit = model.commits[model.cursor]
      if (commit === undefined) return { model }
      const selected = model.selectedShas.includes(commit.sha)
        ? model.selectedShas.filter(other => other !== commit.sha)
        : [...model.selectedShas, commit.sha]
      return withSelection(model, selected)
    },

    FocusedSearch: () => ({ model, commands: [FocusSearch()] }),
    PressedEnter: () => ({ model, commands: [FocusDiff()] }),
    PressedEscape: () => ({ model, commands: [BlurActive()] }),

    SearchFocused: () => ({ model }),
    DiffFocused: () => ({ model }),
    Blurred: () => ({ model }),
  })

// ---- init and keys ---------------------------------------------------------

// In the browser (the dev server, the tests) there is no Tauri bridge and no
// config file, so the window opens the fixture repository and runs one search.
// The desktop build starts on state 01 and lets Rust answer `open_repo`.
const devRepo = { name: 'acme-api', root: 'C:\\work\\acme-api' }

const emptyModel: Model = {
  repo: null,
  recents: [],
  refs: [],
  branch: null,
  keyword: '',
  code: false,
  commits: [],
  selectedShas: [],
  cursor: 0,
  files: [],
  fileIndex: 0,
  patch: null,
  roots: [],
  searching: false,
  searchId: 0,
  patchId: 0,
  error: null,
}

export const init = (): Update.Return<Model, Message> => {
  if (isTauri()) return { model: emptyModel }

  return {
    model: {
      ...emptyModel,
      repo: devRepo,
      recents: [devRepo],
      refs: [
        { name: 'main', kind: 'local' },
        { name: 'release/4.2', kind: 'local' },
        { name: 'svn/legacy', kind: 'local' },
      ],
      keyword: 'ABC-123',
      searching: true,
      searchId: 1,
    },
    commands: [DebouncedSearch({ id: 1, keyword: 'ABC-123', code: false, branch: null })],
  }
}

export const subscriptions = Subscription.make<Model, Message>()(_entry => ({
  keys: Subscription.persistentEntry(
    streamFromKeyBindings<Message>({
      bindings: [
        { keys: '/', whileTyping: 'Allow', mapEvent: () => Message.FocusedSearch() },
        { keys: 'Enter', whileTyping: 'Allow', mapEvent: () => Message.PressedEnter() },
        { keys: 'Escape', whileTyping: 'Allow', mapEvent: () => Message.PressedEscape() },
        { keys: 'j', mapEvent: () => Message.MovedCursor({ delta: 1 }) },
        { keys: 'k', mapEvent: () => Message.MovedCursor({ delta: -1 }) },
        { keys: 'Space', mapEvent: () => Message.PressedSpace() },
      ],
    }),
  ),
}))
