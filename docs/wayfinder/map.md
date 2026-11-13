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
  cap, cancellable, with a branch filter** (Q9, Q15; filter shape open in
  [Branch filter](tickets/branch-filter.md)).
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
- **[Review notes](tickets/review-notes-scope.md) are map #2**, not v1. v1
  sizes its grid for a fourth notes rail, and notes anchor to
  `(sha, path, side, line content)` — line, range, or file, never a row.

## Not yet specified

- What `-a` (code search) means in the UI: a checkbox beside the field, a
  second result group, or a filter on the same list — and how its results are
  explained when they are not message matches.
- What the window does on a very large repository: virtualised diff pane,
  progressive rendering, or a truncation notice.
- Whether the search/selection survives a repo switch or is remembered per
  repo, and where that preference lives.
- Theme: dark only as in the prototype, or light and system-following.
- Window chrome: native title bar or Tauri decorations with the app's own bar.
- How to suppress WebView2's default right-click menu so the app's own menu
  (copy sha, copy subject) is the only one.

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
