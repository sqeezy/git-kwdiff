// Fixture repository for the browser dev server and the tests. Same shapes the
// Rust side returns: two unrelated roots, one keyword on each, one file on both.
import type { Commit, FilePatch, Ref, Repo, RootOf, SearchArgs } from './types'
import type { GitApi } from './git'

type Fixture = Readonly<{
  sha: string
  date: string
  author: string
  subject: string
  root: 'main' | 'legacy'
  branches: ReadonlyArray<string>
  files: ReadonlyArray<FilePatch & { patch: string }>
}>

const fixtures: ReadonlyArray<Fixture> = [
  {
    sha: 'c1a4f2e',
    date: '2019-04-12',
    author: 'Petra Lindqvist',
    subject: 'fix: retry once on gateway 502 (ABC-123)',
    root: 'legacy',
    branches: ['svn/legacy'],
    files: [
      {
        path: 'src/http/retry.ts',
        added: 13,
        removed: 3,
        isNew: false,
        patch: `@@ -10,7 +10,17 @@
 export const withRetry = <A>(effect) =>
   effect.pipe(
-    Effect.retry(Schedule.exponential('50 millis')),
+    Effect.retry(
+      Schedule.exponential('50 millis').pipe(
+        Schedule.whileInput((n: number) => n < 5),
+      ),
+    ),
+    Effect.tapError(error =>
+      Effect.sync(() => logWarn('retry.gateway', { error })),
+    ),
   )`,
      },
    ],
  },
  {
    sha: '8de01b3',
    date: '2019-05-03',
    author: 'Petra Lindqvist',
    subject: 'test: cover the 502 backoff path (ABC-123)',
    root: 'legacy',
    branches: ['svn/legacy'],
    files: [
      {
        path: 'src/http/retry.test.ts',
        added: 18,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,18 @@
+import { describe, expect, it } from 'vitest'
+import { Effect } from 'effect'
+
+describe('withRetry', () => {
+  it('retries a 502 exactly once', async () => {
+    let calls = 0
+    const flaky = Effect.suspend(() => {
+      calls += 1
+      return calls === 1
+        ? Effect.fail(new GatewayError(502))
+        : Effect.succeed('ok')
+    })
+
+    expect(await Effect.runPromise(withRetry(flaky))).toBe('ok')
+    expect(calls).toBe(2)
+  })
+})`,
      },
    ],
  },
  {
    sha: '4b77c90',
    date: '2026-10-28',
    author: 'Bilal Özdemir',
    subject: 'feat: cache retry responses for 60s (ABC-123)',
    root: 'main',
    branches: ['main', 'release/4.2'],
    files: [
      {
        path: 'src/http/cache.ts',
        added: 14,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,14 @@
+import { Cache, Duration } from 'effect'
+
+const gatewayCache = Effect.runSync(
+  Cache.make({ capacity: 512, timeToLive: Duration.seconds(60) }),
+)
+
+export const cachedRetry = (key: string, effect) =>
+  Effect.gen(function* () {
+    const hit = yield* Cache.get(gatewayCache, key)
+    if (hit._tag === 'Some') return hit.value
+    const value = yield* effect
+    yield* Cache.set(gatewayCache, key, value)
+    return value
+  })`,
      },
      {
        path: 'src/server.ts',
        added: 3,
        removed: 1,
        isNew: false,
        patch: `@@ -42,7 +42,9 @@
-  const orders = await fetchOrders(req.query)
+  const orders = await cachedRetry(
+    \`orders:\${req.query.cursor ?? 'head'}\`,
+    fetchOrders(req.query),
+  )
   res.json(orders)`,
      },
    ],
  },
  {
    sha: 'e3f1a07',
    date: '2026-11-02',
    author: 'Yuki Tanaka',
    subject: 'refactor: extract the backoff policy (ABC-123)',
    root: 'main',
    branches: ['main', 'release/4.2'],
    files: [
      {
        path: 'src/http/backoff.ts',
        added: 9,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,9 @@
+import { Schedule } from 'effect'
+
+export const GATEWAY_ATTEMPTS = 5
+
+export const gatewayBackoff = Schedule.exponential('50 millis').pipe(
+  Schedule.whileInput((n: number) => n < GATEWAY_ATTEMPTS),
+  Schedule.jittered,
+)`,
      },
      {
        path: 'src/http/retry.ts',
        added: 2,
        removed: 11,
        isNew: false,
        patch: `@@ -1,16 +1,7 @@
-import { Effect, Schedule } from 'effect'
+import { Effect } from 'effect'
+import { gatewayBackoff } from './backoff'
 
 export const withRetry = <A>(effect) =>
-  effect.pipe(
-    Effect.retry(
-      Schedule.exponential('50 millis').pipe(
-        Schedule.whileInput((n: number) => n < 5),
-      ),
-    ),
-    Effect.tapError(error =>
-      Effect.sync(() => logWarn('retry.gateway', { error })),
-    ),
-  )
+  effect.pipe(Effect.retry(gatewayBackoff))`,
      },
    ],
  },
  {
    sha: '77a90cd',
    date: '2026-09-30',
    author: 'Bilal Özdemir',
    subject: 'docs: explain why ranges need a merge base',
    root: 'main',
    branches: ['main'],
    files: [
      {
        path: 'docs/how-it-works.md',
        added: 6,
        removed: 2,
        isNew: false,
        patch: `@@ -18,8 +18,12 @@
-Only ranges need an ancestor.
+Only ranges need an ancestor:
+
+| command        | needs a merge base |
+| -------------- | ------------------ |
+| git diff A B   | no                 |
+| git diff A..B  | yes                |`,
      },
    ],
  },
  {
    sha: 'd9b2c41',
    date: '2019-06-21',
    author: 'Petra Lindqvist',
    subject: 'chore: drop tslint',
    root: 'legacy',
    branches: ['svn/legacy'],
    files: [
      {
        path: 'tslint.json',
        added: 0,
        removed: 6,
        isNew: false,
        patch: `@@ -1,6 +0,0 @@
-{
-  "extends": ["tslint:recommended"],
-  "rules": { "quotemark": [true, "single"] }
-}`,
      },
    ],
  },
]

const refs: ReadonlyArray<Ref> = [
  { name: 'main', kind: 'local' },
  { name: 'release/4.2', kind: 'local' },
  { name: 'svn/legacy', kind: 'local' },
  { name: 'origin/main', kind: 'remote' },
  { name: 'v0.1.0', kind: 'tag' },
]

const toCommit = (f: Fixture): Commit => ({
  sha: f.sha,
  date: f.date,
  author: f.author,
  subject: f.subject,
})

const newestFirst = (a: Fixture, b: Fixture) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

export const mockGit: GitApi = {
  openRepo: async (path: string): Promise<Repo> => {
    await delay(40)
    const name = path.replace(/[\\/]+$/, '').split(/[\\/]/).pop() ?? 'repository'
    return { name, root: path }
  },

  refs: async () => {
    await delay(40)
    return refs
  },

  search: async ({ keyword, code, branch }: SearchArgs) => {
    await delay(220)
    const needle = keyword.trim().toLowerCase()
    if (needle === '') return []
    const hits = fixtures.filter(f => {
      const inMessage = f.subject.toLowerCase().includes(needle)
      const inCode = code && f.files.some(file => file.patch.toLowerCase().includes(needle))
      return (inMessage || inCode) && (branch === null || f.branches.includes(branch))
    })
    return hits.sort(newestFirst).map(toCommit)
  },

  cancelSearch: async () => {},

  files: async (shas: ReadonlyArray<string>): Promise<ReadonlyArray<FilePatch>> => {
    const byPath = new Map<string, FilePatch>()
    for (const f of fixtures) {
      if (!shas.includes(f.sha)) continue
      for (const file of f.files) {
        const seen = byPath.get(file.path)
        byPath.set(
          file.path,
          seen === undefined
            ? { path: file.path, added: file.added, removed: file.removed, isNew: file.isNew }
            : {
                path: file.path,
                added: seen.added + file.added,
                removed: seen.removed + file.removed,
                isNew: seen.isNew,
              },
        )
      }
    }
    return [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path))
  },

  patch: async (shas: ReadonlyArray<string>, path: string): Promise<string> => {
    const parts: string[] = []
    for (const f of [...fixtures].filter(x => shas.includes(x.sha)).sort(newestFirst).reverse()) {
      for (const file of f.files) {
        if (file.path !== path) continue
        parts.push(`# ${f.sha} ${f.subject}`, `diff --git a/${file.path} b/${file.path}`, file.patch)
      }
    }
    return parts.join('\n')
  },

  roots: async (shas: ReadonlyArray<string>): Promise<ReadonlyArray<RootOf>> =>
    fixtures
      .filter(f => shas.includes(f.sha))
      .map(f => ({ sha: f.sha, root: f.root })),
}
