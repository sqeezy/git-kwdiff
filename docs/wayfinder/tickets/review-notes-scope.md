---
title: Review notes
type: grilling
mode: HITL
status: open
claimed-by: '#6573'
blocked-by: []
---

## Question

The review should be able to leave notes on the diff and, when it is done,
collect them into one document — "just the Markdown file might be sufficient".

Two things have to be settled before anything else is charted:

1. **Does the destination change?** The map currently ends at *reading* a
   combined patch. Notes turn it into a tool that produces an artifact. Either
   the destination is redrawn (notes in v1, the map grows by anchor, storage,
   notes UI and export tickets) or notes are a second map and v1 ships as the
   reader — in which case v1 must still leave room so notes are not a rebuild:
   a fourth rail in the grid, and an anchor identity chosen now.
2. **What is a note attached to?** A line in the patch, a range of lines, a
   file, or a whole commit. Line-anchored notes are the useful ones and the
   expensive ones: they must survive a new search, a different selection order
   and a re-open of the same repository, which means the anchor is
   `(commit sha, path, side, line content)` rather than the rendered row.

Open sub-questions, deliberately not widened yet: where notes are stored
(sidecar file in the repository, app data, or the exported Markdown only) and
what the document looks like. Both hang off the two answers above.
