import { Command, given, message, model, story } from 'foldkit/story'
import { describe, expect, test } from 'vitest'

import { DebouncedSearch, LoadPatch, LoadSelection, update } from '../src/app'
import { Message } from '../src/message'
import type { Model } from '../src/model'

const repo = { name: 'acme-api', root: 'C:\\work\\acme-api' }

const commits = [
  { sha: 'c1a4f2e', date: '2019-04-12', author: 'Petra', subject: 'fix: retry (ABC-123)' },
  { sha: 'e3f1a07', date: '2026-11-02', author: 'Yuki', subject: 'refactor: policy (ABC-123)' },
]

const base: Model = {
  repo,
  recents: [repo],
  refs: [{ name: 'main', kind: 'local' }],
  branch: null,
  keyword: 'ABC-123',
  code: false,
  commits,
  selectedShas: [],
  cursor: 0,
  files: [],
  fileIndex: 0,
  patch: null,
  roots: [],
  branches: [],
  searching: false,
  searchId: 1,
  patchId: 0,
  error: null,
}

// A selection change loads the file list and the roots in one Command; an
// empty answer ends the cascade.
const selectionResolved = Command.resolve(
  LoadSelection,
  Message.SucceededSelection({ files: [], roots: [] }),
)

// The debounce is resolved with a stale id, so update drops it and asks for
// nothing further: the test asserts the new generation, not the search.
const debounceStale = Command.resolve(
  DebouncedSearch,
  Message.SearchRequested({ id: -1, keyword: '', code: false, branch: null }),
)

describe('selection', () => {
  test('ticking a commit selects it', () => {
    story(
      update,
      given(base),
      message(Message.ToggledCommit({ sha: 'c1a4f2e' })),
      selectionResolved,
      model(m => {
        expect(m.selectedShas).toEqual(['c1a4f2e'])
      }),
    )
  })

  test('ticking twice unselects it', () => {
    story(
      update,
      given({ ...base, selectedShas: ['c1a4f2e'] }),
      message(Message.ToggledCommit({ sha: 'c1a4f2e' })),
      selectionResolved,
      model(m => {
        expect(m.selectedShas).toEqual([])
      }),
    )
  })

  test('select all takes every result, across roots', () => {
    story(
      update,
      given(base),
      message(Message.ToggledAll({ on: true })),
      selectionResolved,
      model(m => {
        expect(m.selectedShas).toEqual(['c1a4f2e', 'e3f1a07'])
      }),
    )
  })

  test('space toggles the commit under the cursor', () => {
    story(
      update,
      given({ ...base, cursor: 1 }),
      message(Message.PressedSpace()),
      selectionResolved,
      model(m => {
        expect(m.selectedShas).toEqual(['e3f1a07'])
      }),
    )
  })
})

describe('cursor', () => {
  test('moves within the result list', () => {
    story(
      update,
      given(base),
      message(Message.MovedCursor({ delta: 1 })),
      model(m => {
        expect(m.cursor).toBe(1)
      }),
    )
  })

  test('does not walk past the end', () => {
    story(
      update,
      given({ ...base, cursor: 1 }),
      message(Message.MovedCursor({ delta: 1 })),
      model(m => {
        expect(m.cursor).toBe(1)
      }),
    )
  })
})

describe('search', () => {
  test('a keystroke bumps the generation so late results are dropped', () => {
    story(
      update,
      given({ ...base, searchId: 4 }),
      message(Message.ChangedKeyword({ value: 'ABC-12' })),
      debounceStale,
      model(m => {
        expect(m.searchId).toBe(5)
        expect(m.searching).toBe(true)
      }),
    )
  })

  test('a stale result never lands', () => {
    story(
      update,
      given({ ...base, searchId: 5, searching: true }),
      message(
        Message.SucceededSearch({
          id: 4,
          commits: [{ sha: 'aaaaaaa', date: '2020-01-01', author: 'x', subject: 'old' }],
        }),
      ),
      model(m => {
        expect(m.commits).toEqual(commits)
        expect(m.searching).toBe(true)
      }),
    )
  })

  test('the current result lands and stops the spinner', () => {
    story(
      update,
      given({ ...base, searchId: 5, searching: true, commits: [] }),
      message(Message.SucceededSearch({ id: 5, commits })),
      model(m => {
        expect(m.commits).toEqual(commits)
        expect(m.searching).toBe(false)
        expect(m.cursor).toBe(0)
      }),
    )
  })

  test('the branch filter keeps the ticks', () => {
    story(
      update,
      given({ ...base, selectedShas: ['c1a4f2e'] }),
      message(Message.SelectedBranch({ branch: 'main' })),
      debounceStale,
      model(m => {
        expect(m.branch).toBe('main')
        expect(m.selectedShas).toEqual(['c1a4f2e'])
      }),
    )
  })
})

describe('files and roots', () => {
  test('an empty selection empties the panes', () => {
    story(
      update,
      given({ ...base, files: [{ path: 'a.ts', added: 1, removed: 0, isNew: false }], patch: 'x' }),
      message(Message.SucceededSelection({ files: [], roots: [] })),
      model(m => {
        expect(m.files).toEqual([])
        expect(m.patch).toBeNull()
      }),
    )
  })

  test('a shrunk file list pulls the cursor back into range', () => {
    const files = [
      { path: 'a.ts', added: 1, removed: 0, isNew: false },
      { path: 'b.ts', added: 2, removed: 1, isNew: false },
    ]
    story(
      update,
      given({ ...base, fileIndex: 3, patchId: 7, files }),
      message(Message.SucceededSelection({ files, roots: [] })),
      Command.resolve(LoadPatch, Message.SucceededPatch({ id: 8, patch: '' })),
      model(m => {
        expect(m.fileIndex).toBe(1)
        expect(m.patchId).toBe(8)
      }),
    )
  })

  test('two roots are kept for the divider', () => {
    story(
      update,
      given(base),
      message(Message.SucceededSelection({ files: [], roots: ['root-1', 'root-2', 'root-1'] })),
      model(m => {
        expect(m.roots).toEqual(['root-1', 'root-2'])
      }),
    )
  })

  test('one root does not raise the divider', () => {
    story(
      update,
      given(base),
      message(Message.SucceededSelection({ files: [], roots: ['root-1'] })),
      model(m => {
        expect(m.roots.length).toBe(1)
      }),
    )
  })
})
