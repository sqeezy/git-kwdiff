---
title: Non-content states
type: prototype
mode: HITL
status: closed
claimed-by: '#6573'
blocked-by: []
---

## Question

What do the four states that carry no diff look like in Variant B's frame?

1. No repository open yet (first launch).
2. `git` not found on `PATH`, or the folder is not a repository.
3. A search that matched nothing — and the difference between "no commits" and
   "commits, but none selected".
4. A search that was cancelled, or is still running.

They must live inside the three-pane shell without collapsing it into a
centred apology, and each must say what to do next (`Open repository…`,
`Install git`, `Try a broader keyword`).

## Resolution

Accepted from [prototypes/non-content-states.html](../prototypes/non-content-states.html)
(six panels; running and cancelled share one slot):

1. **Nothing open** — dimmed panes, one primary action, two recents.
2. **No repository here or above** — the empty case only, because the app
   resolves **upward** like git does: pick any folder inside the repository and
   `rev-parse --show-toplevel` finds the root, which the top bar and the window
   title then show. Recents store the **root**, not the folder clicked. The old
   *Open parent* escape hatch is gone: there is no parent left to offer once we
   have walked them all.
3. **git is not on PATH** — needs 2.28+, offers install help and *Re-check*.
4. **No matches** — echoes the keyword, states the rule (case-insensitive,
   every ref).
5. **Filtered away** — names what the filter costs and offers *Search all
   refs*.
6. **Running / cancelled** — results stay while it walks; a cancelled search
   keeps what it found.

Wording stays open to taste; the structure is settled.
