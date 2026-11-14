# kwdiff v1 — spec

Collapsed from the wayfinder map (`docs/wayfinder/map.md`), which closed with
every ticket resolved. Implementation tickets are cut from this file.

## What it is

A Windows desktop app for reviewing changes across **unrelated** branches: open
a repository, search commit messages (and optionally changed lines) across every
ref, tick the commits that belong together, and read their patches side by side
in one three-pane window. It never checks out, stages, commits or merges.

What it does that no client does: a repository imported from SVN next to one
imported last year share no ancestor, and kwdiff still shows their commits and
patches together, because a patch is computed against a commit's own parent.

## Scope

**In v1** — open repository (any subfolder, resolved to the root), recents,
keyword search over messages, `-a` code search checkbox, branch filter, commit
checklist, file list, per-file patch pane, six non-content states, keyboard
accelerators.

**Out of v1** — export or copy of any patch; review notes (map #2); staging,
committing, merging, rebasing; commit graph, blame; plugins; i18n; telemetry;
tabs or multiple repositories; macOS/Linux; code signing; auto-update.

## Flow

1. Launch opens the last repository, or state 01 with recents and *Open
   repository…*.
2. Type a keyword: search after a 250 ms debounce, cancelled on the next
   keystroke; `Enter` runs immediately. The branch filter (default *All refs*)
   narrows the search without clearing ticks.
3. Tick commits: the file pane lists the union of their files with added and
   removed counts; the diff pane shows the selected file's patch. A divider
   appears when the selection's commits share no ancestor.
4. Read. v1 has no output.

## Architecture

```
Tauri 2 (Windows x64, WebView2)
├── src/            Foldkit 0.170 + Effect 4.1.4, Tailwind v4
│   ├── app.ts      Model, Messages, update, init
│   ├── main.ts     view (Runtime.makeElement — owns no document)
│   ├── git.ts      Commands wrapping the Rust API
│   └── ui/         the three panes, from Variant B
└── src-tauri/      Rust: git commands, config, window title, permissions
```

- `Runtime.makeElement`, not `makeApplication`: no `<head>`, no
  `canonical`/`ogUrl`, no Foldkit crash view. The window title is set with
  `getCurrentWindow().setTitle("kwdiff — <root>")` (permission
  `core:window:allow-set-title`); a small crash surface offers *Reopen last
  repository* instead of `location.reload()`.
- No routing, no URL, no history. One window, one screen.
- The grid is sized for a fourth rail: `minmax(0,320px) minmax(0,214px)
  minmax(0,1fr)`. The notes rail of map #2 takes the right-hand column without
  re-laying out the other three.

## Rust API (`src-tauri/src/git.rs`)

```rust
#[tauri::command] async fn open_repo(path: String) -> Result<Repo, GitError>;
#[tauri::command] async fn search(state: State<'_, GitState>, id: u64,
    repo: String, keyword: String, code: bool, branch: Option<String>)
    -> Result<Vec<Commit>, GitError>;
#[tauri::command] async fn cancel_search(state: State<'_, GitState>, id: u64)
    -> Result<(), GitError>;
#[tauri::command] async fn patch(state: State<'_, GitState>,
    sha: String, path: String) -> Result<tauri::ipc::Response, GitError>;
#[tauri::command] async fn roots(state: State<'_, GitState>, shas: Vec<String>)
    -> Result<Vec<RootOf>, GitError>;
#[tauri::command] async fn refs(repo: String) -> Result<Vec<Ref>, GitError>;
```

- `GitState` holds `Mutex<Option<(u64, tokio::process::Child)>>`. A `search`
  with a newer `id` kills the previous child; `cancel_search` does the same on
  demand; both `kill().await` then `wait().await` to reap.
- Every git invocation: `--no-pager`, `GIT_PAGER=cat`, `kill_on_drop(true)`,
  `creation_flags(0x08000000)` on Windows, fixed argv — no shell, no
  interpolation.
- Commit and ref lists return JSON; **patches return bytes** through
  `tauri::ipc::Response` (JSON serialisation of a 5 MB patch is the slow path).
- Errors are a `serde::Serialize` enum so the UI can branch: `GitMissing`,
  `NotARepository { path }`, `Search { message }`, `Io { message }`.

```ts
type Commit = { sha: string; date: string; author: string; subject: string }
type FilePatch = { path: string; added: number; removed: number; isNew: boolean }
type RootOf = { sha: string; root: string }
type Ref = { name: string; kind: 'local' | 'remote' | 'tag' }
```

## Search semantics

`git log --all -i --grep=<kw> --format=…` (plus `-S<kw>` when `-a` is ticked,
unioned not intersected), newest first by commit date, capped at **2 000**
commits with a "narrow the keyword" hint, excluding `refs/stash`. With a branch
filter, the ref replaces `--all`. Matching is case-insensitive over the message.

## Roots and the divider

`git rev-list --max-parents=0 -- <sha>` per selected commit, cached per
`(repo, sha)`. The list shows no root badges; the diff shows one divider —
"these commits share no ancestor" — only when the selection spans more than one
root.

## States

| State | Where | Action |
| --- | --- | --- |
| Nothing open | overlay, panes dimmed | *Open repository…*, recents |
| No repository here or above | overlay | *Choose another folder…* |
| git not on PATH | overlay, needs 2.28+ | *How to install git*, *Re-check* |
| No matches | commits pane | echoes keyword and the rule |
| Filtered away | commits pane | *Search all refs* |
| Running / cancelled | commits pane | results kept |

Artifact: `docs/wayfinder/prototypes/non-content-states.html`.

## Keyboard

`/` focus search · `j`/`k` next/previous commit · `space` toggle ·
`enter` focus the diff · `esc` leave the field. Never bind `Mod+F`, `Mod+P`,
`Mod+R`, `F5` (WebView2 accelerators cannot be disabled).

## Config

One JSON file in the app data dir: `recents` (up to 10 repository roots),
`lastRepo`, per-repository `branch`. A deleted or unfetched ref falls back to
*All refs*.

## Performance

2 000 commits ≈ 400 KB of JSON, one `invoke`. Patches render one file at a time;
past **5 000** lines the pane says "showing the first 5 000 lines". No
virtualisation in v1; the cap is the strategy.

## Tests

- Foldkit story tests over `update`: toggle, select-all/none, keyword filter,
  branch filter keeping ticks, roots split, states, cancelled search.
- Rust tests against a fixture repository built in the test: two orphan roots, a
  merge, a file on both, a keyword hit on each root.
- CI on Windows: both suites, `npm run build`, `tauri build`, and a check that
  `__setDevToolsOverlay` is absent from `dist` (the runtime's own
  `foldkit-devtools` element id is not the overlay).

## Packaging

`tauri build` → NSIS installer and `.exe`, unsigned, attached to a GitHub
Release. No auto-update, no signing.

## Risks

- WebView2 accelerator keys cannot be disabled; the key set avoids them.
- `git` may be missing or old on the colleague's machine: state 03, checked at
  startup.
- Huge patches arrive as bytes; the 5 000-line notice keeps the pane honest.
- Foldkit 0.170 is young: pinned, upgraded by its own ticket.

## Next

Map #2 (review notes): anchors `(sha, path, side, line content)`, the notes rail
the grid reserves, Markdown export, right-click menu with "note here".
