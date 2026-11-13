# PROTOTYPE — a GUI for git-kwdiff

Throwaway code that answers one question:

> **What should a GUI for `git kwdiff` look like — and does Effect 4 + Foldkit
> carry a tool like this without getting in the way?**

Three variants, one route, switchable with the floating bar at the bottom,
with `?variant=A|B|C`, or with `←` / `→` (suppressed while you are typing).

| | Variant | Shape |
| --- | --- | --- |
| A | **Workbench** | one dense column: sticky search, a real table of commits, one continuous patch |
| B | **Review IDE** | three panes — commits, files, diff — dark, keyboard first |
| C | **Review flow** | three steps, big type, one action at a time |

Every variant is structurally different, not a recolour: different layout,
different information hierarchy, different primary affordance.

## Run it

```sh
npm install
npm run dev          # http://localhost:5173/?variant=A
```

`A` is dense and desktop-shaped, `B` wants width, `C` is phone-first — open it
at all three and flip with `→`.

## What is real and what is faked

Real: Foldkit 0.170 on Effect 4.1.4, one Schema-defined Model, fact-named
Messages, a pure `update`, one `Command` (writing `?variant=` into the URL with
`history.replaceState`), one `Subscription` (the arrow keys, via
`Dom.streamFromKeyBindings`). No component state anywhere, no `useEffect`,
nothing mutates the Model outside `update`.

Faked: the data. `src/data.ts` is hand-written — seven commits, two unrelated
roots, five file patches. It is exactly the shape that

```sh
git kwdiff -s --json      # sha, date, author, subject, root
git kwdiff <sha>… --json  # per-commit file patches
```

would have to return for this UI to be real. Building the prototype first is
how those two flags got designed: the search-and-tick flow needs the list and
the patches separately, which the current CLI cannot express.

Nothing here talks to git, reads the filesystem, or persists anything.

## The state inspector

The `state` button in the floating bar prints the whole Model (and the derived
totals) under the page. That is rule 5 of the prototype: surface the state, so
a wrong click is visible instead of mysterious.

## This is not production code

No tests, no error handling, no persistence, no abstractions. It lives on the
branch `prototype/foldkit-gui`, not on `main`; the winning variant gets rewritten
properly if it is promoted.
