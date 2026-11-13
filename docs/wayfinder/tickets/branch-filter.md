---
title: Branch filter
type: grilling
mode: HITL
status: open
claimed-by: '#6573'
blocked-by: []
---

## Question

Searching every ref is right by default, but the tool must be able to focus
down one branch: "show me ABC-123 as it landed on `release/4.2` and nowhere
else".

What is the control, and how does it interact with a selection that already
spans branches?

- **Single-select dropdown with typeahead**, entries: *All refs* (default),
  local branches, remote branches, tags.
- **Multi-select chips** — pick any number of refs; closest to `--all` minus
  the rest, but more UI than the need.
- **Two-state toggle** — *All refs* ⇄ *current branch*, plus a dropdown for
  anything else.

Two consequences to settle in the same pass:

1. When the filter changes, do ticks from other branches stay ticked (and in
   the patch) or clear? The point of the tool is mixing unrelated branches, so
   a filter should narrow the *results*, not the selection.
2. Does the filter persist per repository, and what happens when the saved ref
   no longer exists (deleted branch, un-fetched remote)?
