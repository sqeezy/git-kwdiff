---
title: Non-content states
type: prototype
mode: HITL
status: open
claimed-by: ''
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
