# git-kwdiff

[![CI](https://github.com/sqeezy/git-kwdiff/actions/workflows/ci.yml/badge.svg)](https://github.com/sqeezy/git-kwdiff/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![POSIX sh](https://img.shields.io/badge/shell-POSIX-89e051)

**One unified diff for every commit whose message matches a keyword — across all branches, whether they share an ancestor or not.**

Like TortoiseSVN's *Show log → Show differences as unified diff*, and like the multi-commit diff in JetBrains Rider — but for any number of commits, on any branches, from the command line.

```sh
git kwdiff "ABC-123"          # every commit mentioning ABC-123, one patch after another
git kwdiff -n "ABC-123"       # ... or squashed into a single cumulative diff
```

## Why

Ask git for a diff over a *range* of commits and it needs a common ancestor:

```sh
git diff main..feature     # fine
git range-diff a..b        # needs a merge base
```

Two branches from an unrelated import, a vendored history, a `--orphan` docs
branch, a re-imported repository: no merge base, and most GUIs quietly refuse.
But a commit's patch never needs ancestry — it is computed against the commit's
own parent — and `git diff A B` between two trees always works. `git-kwdiff`
uses exactly those two facts, so it does not care how the branches relate.

More in [docs/how-it-works.md](docs/how-it-works.md).

## Install

Needs git and any POSIX shell — that includes **Git for Windows**, macOS and Linux.

```sh
git clone https://github.com/sqeezy/git-kwdiff.git
cd git-kwdiff
./install.sh                  # copies to ~/.local/bin
```

Or by hand: put `git-kwdiff` on your `PATH` and `chmod +x` it. On Windows,
`C:\Program Files\Git\usr\bin` is already on git's path, or add
`%USERPROFILE%\bin` to your `PATH`. Because git runs `git-kwdiff` with its own
shell, `git kwdiff` then works in cmd, PowerShell, and bash alike.

## Usage

```
git kwdiff [options] <keyword> [-- <path>...]
```

| Option | Meaning |
| --- | --- |
| *(none)* | one patch per matching commit, oldest first — the SVN behaviour |
| `-n` | net diff: apply every matching patch, print one cumulative unified diff |
| `-s` | list the matching commits, no diff |
| `-a` | also match commits whose added/removed lines contain the keyword |
| `-o FILE` | write the diff to `FILE` |
| `-V` / `-h` | version / help |

Matching is case-insensitive and covers the whole commit message; pathspecs
after `--` limit the search and the diff, exactly like `git log`.

### What it looks like

```console
$ git kwdiff -s "ABC-123"
9cc413a 2026-11-13 anna   fix: retry on 502 (ABC-123)
4d7d48b 2026-11-13 ben    feat: cache headers (ABC-123)

$ git kwdiff "ABC-123" | head -14
git-kwdiff: 2 commit(s) matching "ABC-123"
# ---- 4d7d48b 2026-11-13 ben
# feat: cache headers (ABC-123)

diff --git a/src/cache.ts b/src/cache.ts
new file mode 100644
--- /dev/null
+++ b/src/cache.ts
@@ -0,0 +1,3 @@
+export const ttl = 60
```

Pipe it through [`delta`](https://github.com/dandavison/delta) for colour, or
`git kwdiff -n ... > fix.patch` to carry the change to another clone.

## Limits

- `-n` applies patches in commit order; if one selected commit is an ancestor of
  another (a merge plus its merged commits, say), the duplicate patch cannot
  apply and is skipped with a warning — the result is still the net change.
  For a plain linear run, `git diff <oldest>^ <newest>` is cheaper.
- Merge commits are shown against their first parent (`-m --first-parent`);
  a plain `git show` would print nothing for them.
- Rewritten hashes, rename detection and `.gitattributes` diff drivers are
  git's business, not this script's — it prints what `git show` prints.

## Development

```sh
make test     # 22 shell tests, no dependencies
make lint     # shellcheck
```

CI runs the tests on Linux, macOS and Windows.

## License

MIT — see [LICENSE](LICENSE).
