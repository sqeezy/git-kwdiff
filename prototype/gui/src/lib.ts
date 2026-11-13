// PROTOTYPE selectors. Everything here is a pure function of the model, which
// is the point of the Folder/Elm shape: no selectors read state anywhere else.
import { commits, type Commit, type FilePatch } from './data'
import type { Model } from './model'

const newestFirst = (a: Commit, b: Commit) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
const oldestFirst = (a: Commit, b: Commit) => -newestFirst(a, b)

export const matching = (keyword: string): ReadonlyArray<Commit> => {
  const needle = keyword.trim().toLowerCase()
  const found =
    needle === ''
      ? commits
      : commits.filter(commit =>
          `${commit.subject} ${commit.sha} ${commit.author}`
            .toLowerCase()
            .includes(needle),
        )
  return [...found].sort(newestFirst)
}

export const isSelected = (model: Model, sha: string) => model.selectedShas.includes(sha)

export const selectedCommits = (model: Model): ReadonlyArray<Commit> =>
  commits.filter(commit => model.selectedShas.includes(commit.sha)).sort(oldestFirst)

export const filesOf = (list: ReadonlyArray<Commit>): ReadonlyArray<FilePatch> => {
  const byPath = new Map<string, FilePatch>()
  for (const commit of list) {
    for (const file of commit.files) {
      const seen = byPath.get(file.path)
      if (seen === undefined) {
        byPath.set(file.path, file)
      } else {
        byPath.set(file.path, {
          ...seen,
          added: seen.added + file.added,
          removed: seen.removed + file.removed,
          isNew: seen.isNew,
        })
      }
    }
  }
  return [...byPath.values()]
}

export const totals = (model: Model) => {
  const list = selectedCommits(model)
  const files = filesOf(list)
  return {
    commits: list.length,
    files: files.length,
    added: files.reduce((sum, file) => sum + file.added, 0),
    removed: files.reduce((sum, file) => sum + file.removed, 0),
  }
}

export type DiffLine = Readonly<{ text: string; kind: 'add' | 'del' | 'hunk' | 'ctx' | 'file' }>

export const diffLines = (patch: string): ReadonlyArray<DiffLine> =>
  patch.split('\n').map(text => ({
    text,
    kind: text.startsWith('+')
      ? 'add'
      : text.startsWith('-')
        ? 'del'
        : text.startsWith('@@')
          ? 'hunk'
          : text.startsWith('diff --git')
            ? 'file'
            : 'ctx',
  }))

export type GroupedCommit = Readonly<{ commit: Commit; startsRoot: boolean }>

// Newest first, with a marker wherever the unrelated history begins.
export const grouped = (list: ReadonlyArray<Commit>): ReadonlyArray<GroupedCommit> => {
  let previousRoot: string | undefined = undefined
  return list.map(commit => {
    const startsRoot = previousRoot !== undefined && previousRoot !== commit.root
    previousRoot = commit.root
    return { commit, startsRoot }
  })
}

export const fileAt = (model: Model): FilePatch | undefined => {
  const files = filesOf(selectedCommits(model))
  return files[model.fileIndex] ?? files[0]
}
