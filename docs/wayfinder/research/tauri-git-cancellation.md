# Running and cancelling git from Tauri

Ticket: [Running and cancelling git from Tauri](../tickets/tauri-git-cancellation.md)
Resolved by session #6573 (the research subagent timed out; done inline).

## Key facts

1. **Commands can be async, and should be for anything slow.** "Asynchronous
   commands are preferred in Tauri to perform heavy work in a manner that
   doesn't result in UI freezes or slowdowns" — declare `async fn` and it runs
   off the main thread. Blocking work must not sit in a sync command.
   ([Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/))

2. **Tauri has no cancel primitive for a command.** `invoke` returns a promise;
   there is no abort that stops the Rust future, and a second `invoke` simply
   starts a second run. Cancellation is application state: you keep the child
   handle and kill it yourself. This is the fact the whole design hangs on.

3. **`tokio::process::Command` can kill on drop.** `kill_on_drop(true)` invokes
   `kill` on the child when its `Child` handle is dropped, but the docs warn
   that reaping is best-effort — "no additional guarantees are made with regard
   to how quickly or how often this procedure will take place" — and recommend
   `child.wait().await` or `child.kill().await` when the guarantee matters.
   ([tokio::process::Command](https://docs.rs/tokio/latest/tokio/process/struct.Command.html))

4. **Windows needs two flags.** `creation_flags(CREATE_NO_WINDOW)` (0x08000000)
   stops a console window flashing for every git call, and git must be told not
   to page (`--no-pager`, or `GIT_PAGER=cat` in the environment), or it waits
   forever on a pager nobody can see. Both are `Command` builder options.

5. **Big returns should not go through JSON.** "Return values that implement
   `serde::Serialize` are serialized to JSON … This can slow down your
   application if you try to return a large data such as a file … use
   `tauri::ipc::Response`" to hand the frontend an ArrayBuffer instead.
   ([Calling Rust from the Frontend](https://v2.tauri.app/develop/calling-rust/#returning-array-buffers))

6. **Events are the wrong pipe for a patch.** The event system "was designed for
   situations where small amounts of data need to be streamed … not designed for
   low latency or high throughput situations", and payloads are always JSON
   strings. Channels (`tauri::ipc::Channel`) are the streaming path.
   ([Calling the Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/))

## Recommendation

Keep the typed command API, and make cancellation part of the model:

```rust
#[tauri::command]
async fn search(
    state: tauri::State<'_, GitState>,
    id: u64,              // caller's generation counter
    repo: String,
    keyword: String,
    code: bool,
) -> Result<Vec<Commit>, GitError>;      // small: JSON is fine

#[tauri::command]
async fn cancel_search(state: tauri::State<'_, GitState>, id: u64) -> Result<(), GitError>;

#[tauri::command]
async fn patch(state: tauri::State<'_, GitState>, shas: Vec<String>, paths: Vec<String>)
    -> Result<tauri::ipc::Response, GitError>;   // bytes, not JSON

#[tauri::command]
async fn roots(state: tauri::State<'_, GitState>, shas: Vec<String>)
    -> Result<Vec<String>, GitError>;            // one per sha, cached in the shim
```

- `GitState` holds the current child: `Mutex<Option<(u64, tokio::process::Child)>>`.
  A new `search` with a higher `id` kills the previous child before spawning;
  `cancel_search` kills it and returns. Always `kill().await` then `wait().await`
  so the process is reaped and no zombie survives a fast typist.
- Every `Command` gets `.kill_on_drop(true)`, `creation_flags(0x08000000)` on
  Windows, and `.env("GIT_PAGER", "cat")` plus `--no-pager` in argv.
- The UI never depends on cancellation for correctness: it shows results only
  for the newest `id` it sent, so a late answer from a killed run is discarded.
- Patches come back as bytes via `ipc::Response`; the list of commits (2 000
  rows ≈ 300 KB of JSON) stays a normal return value.
- No progress bar in v1. `git log` reports no progress; the honest UI is a
  spinner plus a count of commits already emitted, read line by line from
  stdout if we want it. Cancellation is the feature that matters.

## Sources

- <https://v2.tauri.app/develop/calling-rust/> — async commands, `ipc::Response`
- <https://v2.tauri.app/develop/calling-frontend/> — events vs channels
- <https://docs.rs/tokio/latest/tokio/process/struct.Command.html> — `kill_on_drop`, `creation_flags`
- <https://docs.rs/tauri/latest/tauri/ipc/struct.Response.html> — raw payload path
