---
title: Foldkit inside a desktop webview
type: research
mode: AFK
status: open
claimed-by: ''
blocked-by: []
---

## Question

What in Foldkit 0.170 assumes a browser tab, and what breaks in a Tauri 2
webview (WebView2 on Windows) that serves the app from `tauri://localhost`?

Facts wanted, with file or doc references:

- Does `Runtime.makeApplication` need a real URL / `history`? We prototype with
  `history.replaceState` for `?variant=`; on a desktop app that must go.
- Which Commands, Subscriptions and Mounts touch browser APIs that a webview
  may deny (clipboard, dialogs, media, permissions) — and what the Foldkit
  replacements are (`foldkit/dom`, `@effect/platform-browser`).
- The `@foldkit/vite-plugin` devtools overlay and `@foldkit/devtools`: what
  ships in a production build, and how to keep them out of the installer.
- Focus and keyboard: `Dom.streamFromKeyBindings` listens on `window`; any
  known interference from the webview chrome or Tauri's own key handling.
