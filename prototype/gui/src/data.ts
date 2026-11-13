// PROTOTYPE data. This is what `git kwdiff -s --json` would return, plus the
// per-commit patches `git show` would print. Two unrelated roots on purpose:
// "main" was imported in 2024, "legacy" comes from a 2019 SVN import.

export type FilePatch = Readonly<{
  path: string
  added: number
  removed: number
  isNew: boolean
  patch: string
}>

export type Commit = Readonly<{
  sha: string
  date: string
  author: string
  subject: string
  root: 'main' | 'legacy'
  files: ReadonlyArray<FilePatch>
}>

export const repo = { name: 'acme-api', branches: 'main + svn/legacy (no merge base)' }

export const commits: ReadonlyArray<Commit> = [
  {
    sha: 'c1a4f2e',
    date: '2019-04-12',
    author: 'Petra Lindqvist',
    subject: 'fix: retry once on gateway 502 (ABC-123)',
    root: 'legacy',
    files: [
      {
        path: 'src/http/retry.ts',
        added: 13,
        removed: 3,
        isNew: false,
        patch: `@@ -10,7 +10,17 @@ import { Effect, Schedule } from 'effect'
 export const withRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
   effect.pipe(
-    Effect.retry(Schedule.exponential('50 millis')),
+    Effect.retry(
+      Schedule.exponential('50 millis').pipe(
+        Schedule.whileInput((n: number) => n < 5),
+      ),
+    ),
+    // A 502 from the gateway is usually transient, so one more try is
+    // enough. A 500 means our own handler threw; retrying hides that.
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
    files: [
      {
        path: 'src/http/retry.test.ts',
        added: 31,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,31 @@
+import { describe, expect, it } from 'vitest'
+import { Effect } from 'effect'
+
+import { withRetry } from './retry'
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
+    const result = await Effect.runPromise(withRetry(flaky))
+
+    expect(result).toBe('ok')
+    expect(calls).toBe(2)
+  })
+
+  it('gives up after five attempts', async () => {
+    const alwaysFails = Effect.fail(new GatewayError(502))
+    const exit = await Effect.runPromiseExit(withRetry(alwaysFails))
+
+    expect(exit._tag).toBe('Failure')
+    expect(countAttempts(exit)).toBe(5)
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
    files: [
      {
        path: 'src/http/cache.ts',
        added: 24,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,24 @@
+import { Cache, Duration, Effect } from 'effect'
+
+// Shared across requests: a 502 that just recovered should not be retried
+// again by the next caller within a minute.
+const gatewayCache = Effect.runSync(
+  Cache.make({
+    capacity: 512,
+    timeToLive: Duration.seconds(60),
+  }),
+)
+
+export const cachedRetry = <A, E, R>(key: string, effect: Effect.Effect<A, E, R>) =>
+  Effect.gen(function* () {
+    const hit = yield* Cache.get(gatewayCache, key)
+    if (hit._tag === 'Some') return hit.value
+
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
        patch: `@@ -42,7 +42,9 @@ router.get('/v1/orders', async (req, res) => {
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
    files: [
      {
        path: 'src/http/backoff.ts',
        added: 16,
        removed: 0,
        isNew: true,
        patch: `@@ -0,0 +1,16 @@
+import { Schedule } from 'effect'
+
+export const GATEWAY_ATTEMPTS = 5
+
+export const gatewayBackoff = Schedule.exponential('50 millis').pipe(
+  Schedule.whileInput((n: number) => n < GATEWAY_ATTEMPTS),
+  Schedule.jittered,
+)
+
+export const isTransient = (status: number): boolean =>
+  status === 502 || status === 503 || status === 504`,
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
 
 export const withRetry = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
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
    files: [
      {
        path: 'docs/how-it-works.md',
        added: 9,
        removed: 2,
        isNew: false,
        patch: `@@ -18,8 +18,15 @@
-Only ranges need an ancestor.
+Only ranges need an ancestor:
+
+| command            | needs a merge base |
+| ------------------ | ------------------ |
+| git diff A B       | no                 |
+| git show <sha>     | no                 |
+| git diff A..B      | yes                |
+
+That is the whole trick.`,
      },
    ],
  },
  {
    sha: 'a1c3e55',
    date: '2026-11-10',
    author: 'Yuki Tanaka',
    subject: 'chore: bump effect to 4.1.4',
    root: 'main',
    files: [
      {
        path: 'package.json',
        added: 1,
        removed: 1,
        isNew: false,
        patch: `@@ -14,7 +14,7 @@
-    "effect": "4.1.3",
+    "effect": "4.1.4",`,
      },
    ],
  },
  {
    sha: 'd9b2c41',
    date: '2019-06-21',
    author: 'Petra Lindqvist',
    subject: 'chore: drop tslint',
    root: 'legacy',
    files: [
      {
        path: 'tslint.json',
        added: 0,
        removed: 14,
        isNew: false,
        patch: `@@ -1,14 +0,0 @@
-{
-  "extends": ["tslint:recommended"],
-  "rules": {
-    "quotemark": [true, "single"],
-    "semicolon": [true, "never"]
-  }
-}`,
      },
    ],
  },
]
