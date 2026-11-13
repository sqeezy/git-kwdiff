# How git-kwdiff works, and why the other tools say no

## The problem is the range, not the branches

Git's history is a DAG, and most of its diffing commands are built around
*ranges*:

| Command | Needs a common ancestor? |
| --- | --- |
| `git diff A B` | no — it compares two trees |
| `git show <sha>` | no — the patch is against that commit's parent |
| `git log --all -p` | no — walking several roots is fine |
| `git diff A..B` | yes |
| `git diff A...B` | yes, for the merge base |
| `git range-diff A..B` | yes |

So the ability is there all along; what fails is the syntax. A GUI that offers
"compare these two commits" through `A..B`, or "diff of this range", will refuse
two branches without a shared root — and that is most of them:

- **TortoiseGit** — closest to TortoiseSVN: filter the log by message, tick
  *All branches*, Ctrl-select **two** commits, *Show differences as unified
  diff*. For three or more it offers *Format Patch* instead, which is
  range-based.
- **Git Extensions** — two commits in the revision grid, *Diff* tab.
- **SmartGit** — two commits compare in the Changes view; more only shows a
  count.
- **JetBrains Rider / IntelliJ** — Log → Ctrl-select non-contiguous commits →
  the diff of all of them. The one GUI that does the N-commit union natively.
- **VS Code Git Graph, github.com/compare** — two commits or a range only.

`git-kwdiff` is the missing N-commit operation, done on the primitives that need
no ancestry.

## Patches mode (the default)

```
git log --all --grep=<keyword> --format=%H
        ↓  (oldest first)
git show -m --first-parent <sha>   for each commit
```

`--all` lists every ref, so unconnected roots are included. Each `git show`
diffs the commit against its own parent; nothing is compared across branches, so
nothing can fail to have a merge base. Output is the familiar SVN shape: a
header per commit, then its patch.

`-m --first-parent` is there because a plain `git show` of a merge commit prints
no patch at all. With it, a merge contributes the difference to its first
parent — which is what "what did this merge bring in" means for most people.

## Net mode (`-n`)

Sometimes you want one patch that takes a tree from A to B without caring which
commit did what — a PR-style diff. Patches from unrelated branches cannot simply
be concatenated for that, so `-n` applies them:

```
GIT_INDEX_FILE=<temp index>
git read-tree --empty
for each sha:  git diff-tree -p <sha> | git apply --cached --3way
git diff <empty tree> <resulting tree>
```

The real index and working tree are never touched. A patch that cannot apply —
the usual case is a merge commit whose changes a selected child commit already
made — is skipped with a warning on stderr, so the net result stays correct.

Because `git apply --3way` needs the commit's blobs, `-n` wants a normal clone,
not a shallow or partial one.

## Why `-a` is a union

`git log --grep=X -SX` matches commits where the message *and* the code mention
X. That is rarely what people mean, so `-a` runs the two searches separately and
merges the results, then re-sorts them by commit date (`git log --no-walk=sorted`).

## When a tool insists on a range

If some other tool truly needs connected history, give it one — these rewrite
nothing, and can be undone:

```sh
git merge --allow-unrelated-histories <branch>     # actually join them
git replace --graft <sha> <fake-parent>            # pretend a parent exists
```
