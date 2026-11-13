---
title: Copy patch format
type: grilling
mode: HITL
status: open
claimed-by: ''
blocked-by: []
---

## Question

What exactly lands on the clipboard — and in the saved `.diff` — when the user
picks four commits across two roots and hits Copy?

Candidates:

1. **Readable stream** (what the CLI did): one `# ---- 4d7d48b 2026-11-13 anna`
   header per commit, then its `diff --git` hunks, oldest first. Nice to read,
   not `git apply`-able as one file.
2. **`git format-patch` stream**: `From <sha> Mon Sep 17 00:00:00 2001` per
   commit, patch body, `-- ` signature. Applyable with `git am`, noisier.
3. **Bare unified diff**: hunks only, no per-commit headers, with a
   `# 4 commits` comment on top. Smallest, least self-describing.

Related sub-questions, to settle in the same pass: does Save write the same
bytes as Copy or a different format; and does the header carry the commit
subject (useful in a chat) or stay machine-clean?
