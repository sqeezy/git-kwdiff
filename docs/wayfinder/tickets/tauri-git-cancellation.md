---
title: Running and cancelling git from Tauri
type: research
mode: AFK
status: closed
claimed-by: '#6573'
blocked-by: []
---

## Question

How does a Tauri 2 app run a long `git log --all --grep` and cancel it cleanly
when the user types another character, without freezing the UI — and how big a
payload can a command return before the IPC bridge becomes the problem?

Facts wanted, with versions and links:

- Tauri 2 command signatures for async work (`async fn` vs `spawn_blocking`),
  and how a command's future is dropped or killed when the frontend stops
  caring.
- Killing a child process on Windows: `tokio::process::Command::kill`,
  process groups, and the known "git keeps running" pitfalls.
- IPC payload limits and throughput for returning large strings (a 5 MB patch)
  versus streaming through a channel; where the docs give numbers or warn.
- Whether `tauri::ipc::Channel` streams are the right shape for progress
  (bytes read, commits walked) and what they cost.

## Resolution

Researched in [research/tauri-git-cancellation.md](../research/tauri-git-cancellation.md).

The short version: Tauri has **no** cancel primitive — a command's future is
never aborted — so cancellation is our own state. `GitState` keeps the current
`tokio::process::Child`; a `search` with a newer generation id kills the
previous child, and `cancel_search(id)` does the same on demand, always
`kill().await` then `wait().await` to reap. Commands stay `async fn`; every
git call gets `--no-pager`, `GIT_PAGER=cat`, `kill_on_drop(true)` and, on
Windows, `creation_flags(0x08000000)` so no console flashes.

Payloads: commit lists are small enough to stay JSON; patches go back as bytes
through `tauri::ipc::Response` (JSON serialisation is the slow path), and
events are the wrong pipe for both — they are JSON-only and documented as not
for throughput. Channels are reserved for progress we may want later.
