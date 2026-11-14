# kwdiff — v1

## Destination

A Windows desktop app (unsigned `.exe` on a GitHub Release) in which you open a
repository, search commit messages across **every** ref — unrelated branches
included — tick the commits you want, and read their combined patch.
Variant B, working, on a colleague's machine.

## Notes

- Built with Foldkit 0.170 on Effect 4.1.4, Tauri 2, Tailwind v4, TypeScript.
- Variant B ("Review IDE") won the prototype; branch `prototype/foldkit-gui`
  is the reference, and it gets rewritten, not copied.
- The CLI (`git-kwdiff`) is retired: kept only on tag `v0.1.0`, deleted from
  `main`, repo renamed `sqeezy/kwdiff`.
- Wayfinder here is **plan, don't do**. Implementation waits for the spec.
- Tracker: local markdown in this folder + one pi-phone board task per ticket.
- Owner: Anton. One colleague is the first user; treat their machine as the
  acceptance test.

## Decisions so far

- **The GUI replaces the CLI** — `git-kwdiff` leaves `main` and survives on tag
  `v0.1.0`; repo renamed `sqeezy/kwdiff` (grilling, Q2).
- **Variant B wins** — three panes (commits, files, diff), dark, keyboard
  accelerators. Artifact: branch `prototype/foldkit-gui`.
- **Tauri 2, not Electron** — ~10 MB installer, Rust side owns git (Q1, Q7).
- **Git access is a small typed Rust API** — `search`, `patch`, `roots`,
  `repo`. Fixed argv, no shell plugin, no injection surface (Q7).
- **Roots are computed for the selection, not per row** — one cached
  `rev-list --max-parents=0`; the divider appears in the patch area only (Q8).
- **Search: all refs except stash, case-insensitive, newest first, 2000-commit
  cap, cancellable** (Q9, Q15).
- **Recents: config file in the app data dir, last 10, auto-open the last;
  repositories resolved with `git rev-parse --show-toplevel`** (Q14).
- **Mouse first, six accelerators** — `/`, `j`, `k`, `space`, `enter`, `esc`
  (Q12; `ctrl+c` withdrawn with the export feature).
- **Identity: `kwdiff`, `kwdiff.exe`, app id `dev.sqeezy.kwdiff`** (Q13).
- **Tests: Foldkit story tests over `update`, Rust tests against a fixture
  repository, Windows CI that builds the installer; no e2e** (Q17).
- **v1 feature cut** — open/recents, message search (plus `-a` as a checkbox),
  checklist with the "no merge base" divider, file list, patch pane. Nothing
  else (Q3, Q4).
- **Shipping: Windows x64, unsigned, GitHub Release, no auto-update** (Q6).
- **[Running and cancelling git from Tauri](tickets/tauri-git-cancellation.md)**:
  Tauri cannot cancel a command, so cancellation is our own child-process
  state (generation id + `kill().await`); patches return as bytes through
  `ipc::Response`, commit lists stay JSON, events are out of the question.
- **[Foldkit inside a desktop webview](tickets/foldkit-in-desktop-webview.md)**:
  the runtime needs no URL, so the `?variant=` machinery goes; copy through
  `h.OnCopyText` / `Clipboard.writeString`, paths through Tauri's
  `dialog`/`fs` plugins, DevTools already absent from builds, and never bind
  `Mod+F` / `Mod+P` / `Mod+R` / `F5` (WebView2 accelerators).
- **[Page ownership](tickets/page-ownership.md)**: `Runtime.makeElement`, not
  `makeApplication` — the window owns no document, sets its own title, and
  writes its own crash surface so recovery can reopen the last repository.
- **[Branch filter](tickets/branch-filter.md)**: single-select dropdown
  (*All refs* by default), persists per repository, and never clears ticks —
  filtering narrows results, not the selection.
- **[Non-content states](tickets/non-content-states.md)**: six panels accepted
  from the prototype; repositories resolve **upward** like git
  (`rev-parse --show-toplevel`), the bar and window title show the root, and
  the recents remember the root rather than the clicked folder.
- **`-a` in the UI**: a checkbox beside the field; rows found only by a changed
  line carry a small `code` tag, and opening one scrolls to the matching hunk.
- **Large repositories**: no virtualisation in v1 — the 2 000-commit cap keeps
  the list flat, the diff renders one file at a time, and past 5 000 lines the
  pane says "showing the first 5 000 lines".
- **Theme**: dark only, the prototype palette. Light and system-following are a
  later effort.
- **Window chrome**: native title bar, no custom decorations.
- **Right-click**: WebView2's default menu in v1; the custom menu (note here,
  copy sha) arrives with review notes, where suppression can be done properly.
- **[Review notes](tickets/review-notes-scope.md) are map #2**, not v1. v1
  sizes its grid for a fourth notes rail, and notes anchor to
  `(sha, path, side, line content)` — line, range, or file, never a row.

## Not yet specified

Nothing. The map closed on 2026-11-13 with no open tickets and no fog; the
result is [../spec.md](../spec.md). Any further decision belongs to a new map
(review notes) or to the spec's own review.

## Out of scope

- macOS and Linux builds.
- Code signing, notarisation, auto-update.
- Staging, committing, merging, rebasing — this is a reader, not a client.
- Commit graph, blame, file history, cherry-pick.
- Plugin API, scripting, themes marketplace.
- Translation / i18n.
- Telemetry.
- Tabs or multiple repositories in one window.
- Copying or saving the patch — v1 reads, it does not export. Ticket
  *Copy patch format* closed as out of scope; export returns only if someone
  asks for it, as a fresh effort.
- Review notes and the exported Markdown review — past this destination;
  charted as map #2. The anchor model and the reserved rail are recorded in
  the closed ticket so that effort starts warm.
