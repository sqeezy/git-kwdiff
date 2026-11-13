---
title: Foldkit inside a desktop webview
type: research
mode: AFK
status: closed
claimed-by: 'research subagent of #6573'
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

## Resolution

Researched in [research/foldkit-in-desktop-webview.md](../research/foldkit-in-desktop-webview.md).

The runtime needs no URL: `makeApplication` reads `location` only when a
`routing` config is passed, so the `?variant=` Command, `UriReplaced` and the
`location.search` read in `init` all go. What does assume a tab sits around the
runtime — `Document` head management, the link interceptor, `Navigation.load`,
`window.open`, clipboard **read** (WebView2 denies it), HTML5 drop (needs
`dragDropEnabled: false` on Windows) — and each has a stated replacement:
`h.OnCopyText` / `Clipboard.writeString` for copy, Tauri `dialog`/`fs` plugins
for paths, `opener` for links.

DevTools already ships nothing: the overlay is injected into a build only when
`@foldkit/devtools` is a runtime dependency, and the bridge is gated on
`import.meta.hot`. Add an `rg "foldkit-devtools" dist` assert anyway.

Keys: our set is safe, but never bind `Mod+F`, `Mod+P`, `Mod+R`, `F5` —
WebView2's browser accelerator keys cannot be disabled through Tauri config
(tauri#7418).

One structural question the research surfaced and could not settle is filed as
[Page ownership](page-ownership.md).
