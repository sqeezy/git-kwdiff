# Wayfinding operations (this repo)

Wayfinder's artifacts live in this folder because we chose a local-markdown
tracker: the map and its tickets are versioned with the code, and the glanceable
state lives in the pi-phone board (one task per ticket).

## The map

`map.md` is the single map. It is an index, not a store: a decision lives in
exactly one place — its ticket file — and the map only gists it and links to it.
Loaded at low resolution at the start of every session.

## Tickets

One file per ticket in `tickets/<slug>.md`. The file name is the ticket's
**name**; refer to tickets by name in narration, never by file path alone.

Frontmatter is the ticket's labels and edges:

```yaml
---
title: Copy patch format
type: grilling        # research | prototype | grilling | task
mode: HITL            # HITL or AFK
status: open          # open | closed
claimed-by: ''        # the session that claimed it, e.g. "#6573"
blocked-by: []        # ticket file stems
---
```

- **Claiming** = filling `claimed-by` before doing any work.
- **Blocked** = anything in `blocked-by` is still `open`.
- **Frontier** = `status: open` + `blocked-by` all closed + `claimed-by: ''`.
  This is the query a session runs to pick its next decision.
- **Resolving** = add a `## Resolution` section with the answer, set
  `status: closed`, then append one line to the map's *Decisions so far*.

## Ticket types

| Type | Mode | Resolved by |
| --- | --- | --- |
| `grilling` | HITL | grilling + domain-modeling, with the owner in the room |
| `prototype` | HITL | prototype skill; link the artifact from the ticket |
| `research` | AFK | a research subagent on a `research/<name>` branch, linked from the ticket |
| `task` | either | manual work that unblocks a decision, never a slice of the build |

## Rules

- Plan, don't do: a ticket resolves a decision. Code that ships belongs
  downstream of the map, after `to-spec` and `to-tickets`.
- One ticket per session, except `research`, which runs in parallel.
- Every ticket reads as a question. "Build the X" is not a ticket.
- The map is finished when nothing is left to decide — then it hands off to a
  spec, not to a pull request.
