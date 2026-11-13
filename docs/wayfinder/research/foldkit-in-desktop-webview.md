# Foldkit 0.170 inside a Tauri 2 desktop webview

Question: what in Foldkit assumes a browser *tab*, and what breaks when the GUI is served from a
Tauri 2 webview (`http://tauri.localhost` on Windows, `tauri://localhost` elsewhere) instead of a
tab with an address bar?

Short answer: **the runtime does not need a URL.** `Runtime.makeApplication` / `Runtime.run` read
`window.location` only when a `routing` config is given, and `history` only through
`foldkit/navigation` plus that routing config. What assumes a tab is everything *around* the
runtime: `Document` head management (title/lang/canonical), the link-click interceptor,
`Navigation.load`/`openUrl`, `window.open`/new-window, clipboard-read permission, HTML5
drag-and-drop, and the dev-server-only DevTools overlay. Our `?variant=` Command is app code, not
framework, and is the only history use in the prototype.

Paths: `foldkit/dist/…` is under `prototype/gui/node_modules/foldkit/dist/`, `@foldkit/x/dist/…`
under `node_modules/@foldkit/x/dist/`, `@effect/…` under `node_modules/@effect/…/dist/`.

## Key facts

### 1. The runtime: no URL, no history, unless you ask for routing

- `makeApplication` reads `window.location.href` **only** in the `hasRouting` branch, and throws
  (`Option.getOrThrow`) if it does not parse: `runtime/makeApplication.js:25-27`. Without `routing`
  it never touches `location`; `runtime/runtime.js:105` repeats the same guard at start.
- Without `routing`, nothing in the boot path calls `history`, `popstate` or `new URL`. The only
  mandatory substrate is `container: HTMLElement | null` (`runtime/makeApplication.js:11-24`, a
  plain error when null) and `document` for the head work in §2.
- With `routing`, three global listeners go in: `popstate` on `window`, a **document-level `click`
  interceptor** on every `<a href>`, and `foldkit:urlchange` on `window`
  (`runtime/browserListeners.js:14-71`, attached at `runtime/runtime.js:190`). The click
  interceptor `preventDefault()`s and splits internal/external by comparing `new URL(href).origin`
  with `location.origin` (`browserListeners.js:49-56`). Under a custom scheme `URL.origin` is the
  string `"null"` for both sides, so same-scheme links still match and `https:` links still count
  as external — degenerate, but not misfiring. On Windows (`http://tauri.localhost`) it behaves
  normally.
- `foldkit/url` is just `new URL` (`url/index.js:20-41,77`), so `tauri://localhost/` and
  `http://tauri.localhost/` both decode (`hostname` `localhost` / `tauri.localhost`, `pathname` `/`).
- `history` is touched in one module only: `navigation/index.js:4-16` (`pushUrl`/`replaceUrl`/
  `back`/`forward`), plus `load` (`location.assign`, `:18`) and `openUrl` (`window.open`, `:19-23`).

⇒ The prototype's `ReplaceUrl` Command (`src/app.ts:18-33`) and the
`new URLSearchParams(location.search)` in `init` (`src/app.ts:85`) are our only URL coupling.
Nothing forces either.

### 2. What a desktop window changes about the document

- The `Document` (`title`, `lang`, `dir`, `canonical`, `ogUrl`, `body` — `html/index.d.ts:125-132`)
  is reapplied every render: `document.title`, `<html lang/dir>`, `<link rel=canonical>`,
  `<meta property=og:url>` in `<head>`, with a `MutationObserver` on `head` and `documentElement`
  (`runtime/documentMetadata.js:3-16, 90-134`, entry `:135`).
- No tab, bookmark or crawler in a Tauri window: `canonical`/`ogUrl` are noise. And
  `document.title` is **not** the OS window title — wry forwards `DocumentTitleChanged` only when
  a handler is registered (`wry src/webview2/mod.rs`, `attach_handlers`), which Tauri 2 does not
  wire up. Set the native title with `getCurrentWindow().setTitle(...)`
  (<https://v2.tauri.app/reference/javascript/api/namespacewindow>).
- The documented way to stay out of `<head>` is `Runtime.makeElement`: it "never touches the
  document `<head>` or the `<html>` element", while `makeApplication` is "correct for an app that
  owns its tab" (<https://foldkit.dev/core/runtime#page-ownership>).
- Crash view: `document.title = 'Application Crash'` with the only recovery an
  `onclick="location.reload()"` button (`runtime/crashUI.js:163`) — a full app restart on desktop.

### 3. Browser APIs Foldkit itself reaches for, and what a webview can deny

| Foldkit touch point | Source | In a Tauri webview |
| --- | --- | --- |
| Render loop on `requestAnimationFrame` | `runtime/renderer.js:394,452` | Fine, but rAF stops/throttles while minimised; `backgroundThrottling` is documented **unsupported on Windows/Linux/Android** (<https://v2.tauri.app/reference/config>). Never let correctness depend on frames while hidden. |
| `AnimationFrame` subscription | `subscription/animationFrame.js:11-15,30` | Same throttle; docs already say rAF pauses when the tab is hidden. |
| `window.matchMedia` | `runtime/runtime.js:38-42` (only with `viewTransition`), `dom/streamFromMediaQuery.js:37` | Works in WebView2; `prefers-reduced-motion` follows the Windows setting. |
| `navigator.userAgent` → `Mod` | `dom/streamFromKeyBindings.js:203-211,386` | Correct: Windows UA → `Mod` = Control, macOS → Meta. |
| `ResizeObserver`, `scroll`, `resize` | `dom/elementMovement.js:7,39` | Fine. |
| `<dialog>`, `inert`, scroll-lock | `dom/dom.js:159,257,260,371`; `dom/inert.js`; `dom/scrollLock.js` | Fine on WebView2 (Chromium 111+); the surface most at risk on WebKitGTK (Linux) — verify before shipping Linux. |
| `FileReader` | `file/reader.js:4` | Fine. |
| `<input type=file>` picker | `file/select.js:2-26` | Works, but it is WebView2's picker returning `File` blobs with no real path; for "open a repo" use the Tauri dialog + fs plugins. |
| Synchronous clipboard via events | `html/index.js:581-602` (`OnPastePreventDefault`, `OnCopyText`, `OnCutText`), docs `:1899-1933` | Best desktop option: `copy`/`cut`/`paste` carry `clipboardData`, no permission, no await. |
| HTML5 drop + `OnDropFiles` | `html/index.js:689-702`; `html/index.d.ts:1699` | **Broken on Windows by default**: `dragDropEnabled` (default `true`) replaces the webview's drag-drop handler; Tauri's docs say disabling it "is required to use HTML5 drag and drop on the frontend on Windows" (<https://v2.tauri.app/reference/config>). |
| `window.open` | `navigation/index.js:19-23` | wry marks `NewWindowRequested` handled-and-dropped when the app registers no new-window handler (`wry src/webview2/mod.rs`, `attach_handlers`): the call can silently do nothing. Use the `opener` plugin. |
| `location.assign` (`Navigation.load`) | `navigation/index.js:18` | Replaces the only document the window has, no back button, no address bar: one-way out of the app. |
| `sessionStorage` (preserved scroll) | `runtime/scrollPreservation.js:4-34` | Dev-only (`runtime/runtime.js:44` needs `import.meta.hot`), already wrapped in `try`. |
| `navigator.clipboard.*` | not used by Foldkit core | WebView2 denies `clipboard-read` unless wry registers the auto-allow `PermissionRequested` handler, which it only does when its `clipboard` attribute is set (`wry src/webview2/mod.rs`, `init_webview`). Writes work in a user gesture; reads are unreliable. |

Replacements to standardise on: clipboard → `h.OnCopyText`/`h.OnPastePreventDefault` for anything
tied to a selection or keystroke, `@effect/platform-browser/Clipboard` (`Clipboard.d.ts:1-51`,
`writeString`) for a button, Tauri `clipboard-manager` for system-wide read. Permissions →
`Permissions.d.ts:1-34` only queries; grants are answered by wry, which exposes no permission
handler through Tauri config, so treat camera/mic/geolocation as unavailable. Files/dialogs → not
`@effect/platform-browser/FileSystem` (File System Access is gated in WebView2); use the Tauri
`dialog`/`fs` plugins behind a Command so the effect stays in the Effect channel.

### 4. DevTools: what ships, how to keep it out, what happens without the bridge

- The overlay is a virtual module calling `__setDevToolsOverlay(overlay)`
  (`@foldkit/vite-plugin/dist/devToolsOverlay.js:10-15`). Rule: dev server → inject whenever
  `@foldkit/devtools` is installed; **production build → inject only if it is in the app's
  `dependencies`** (`:70-87`); `transformIndexHtml` adds a `<script type=module>` at
  `head-prepend` (`:132-148`). It is a **devDependency** in `prototype/gui/package.json`, so
  `vite build` leaves it out with no config. Docs: "Production builds omit it without an
  application-level environment check" (<https://foldkit.dev/core/devtools>).
- Runtime side, recording is gated on `import.meta.hot`: `resolveDevToolsConfig` filters with
  `isVisible(show ?? 'Development', !!import.meta.hot && !isInIframe)`
  (`runtime/devToolsConfig.js:26-33`, `runtime/visibility.js:6`). In a packaged build
  `import.meta.hot` is undefined → no store, no history, no overlay, even with a `devTools: {…}`
  object present. `show: 'Always'` is the only opt-in, and it still needs the package as a regular
  dependency to have an overlay to mount.
- The WebSocket bridge and MCP relay are HMR-only: `if (import.meta.hot) startWebSocketBridge(…)`
  (`runtime/devToolsIntegration.js:131-140`); the bridge's doc says "Production-safe: callers must
  check `import.meta.hot` is defined" (`devTools/webSocketBridge.js:54-57`). **Nothing fails when
  the bridge is absent — it is never started.** `@foldkit/devtools-mcp` is a Node process, not a
  client dependency.
- So there is nothing to strip manually, but assert it: an `rg -l "foldkit-devtools" dist` check in
  the desktop build guards against someone promoting the package to `dependencies`.
- Dev-only and therefore absent in the packaged app (silence is not a bug): model freezing, scroll
  preservation, duplicate-id scanner, slow-phase reports, state-preserving reload
  (`runtime/runtime.js:43-47, 131-186`).

### 5. Key bindings: `streamFromKeyBindings` vs webview chrome

- Default target is `document` (`dom/streamFromKeyBindings.js:192-196`); it adds `keydown` there,
  plus `blur` on the window and `visibilitychange` on the document to clear half-typed sequences
  (`:382-403`). All exist in a webview.
- Suppression while typing inspects the event's composed path for `input`/`textarea`/`select`/
  contenteditable; `whileTyping: 'Allow'` opts out; matched presses call `preventDefault()` unless
  `preventDefault: false` (`dom/streamFromKeyBindings.d.ts:52-65`).
- The real conflicts are not Foldkit's: WebView2 *browser accelerator keys* are still on. wry only
  calls `SetAreBrowserAcceleratorKeysEnabled(false)` when its `browser_accelerator_keys` flag is
  false (`wry src/webview2/mod.rs`, `set_webview_settings`), and Tauri 2 exposes no
  `tauri.conf.json` field for it (open: <https://github.com/tauri-apps/tauri/issues/7418>). So
  `Ctrl+F` (find bar), `Ctrl+P`, zoom `Ctrl+±` and WebView2's reload shortcut can win; the reliable
  rule is **don't bind `Mod+F`, `Mod+P`, `Mod+R`, `F5`, `Mod+Shift+I`**.
- Anything in a Tauri native menu with an accelerator wins over the webview; if we add a menu bar,
  it owns `Mod+…`.
- Default context menus are on (`SetAreDefaultContextMenusEnabled`, same function), so right-click
  gives WebView2's menu (Reload, Inspect in debug) over a diff pane — a UX decision, not a failure.

### 6. SSR / hydration

Nothing in the `Runtime.run` path is SSR-flavoured: the first render builds the DOM fresh and
replaces the container's children (`runtime/start.d.ts:24-29`). Hydration is a separate entry
point, `Runtime.hydrate` (experimental, `start.d.ts:48-72`); server pieces sit under
`foldkit/experimental/server`. The only trace in the normal path is `makeApplication` looking for a
hydration stamp and server markup (`runtime/makeApplication.js:9-19`) — harmless for a plain Vite
`index.html`, but do not ship a template containing `data-foldkit-app`. `renderDocument`,
`ssr.build` and `buildId` (`start.d.ts:32-47`) only matter if we choose SSG/SSR; a Tauri frontend
should not.

## What we change in kwdiff

1. **Delete the `?variant=` machinery**: the `ReplaceUrl` Command (`src/app.ts:18-33`),
   `UriReplaced` (`src/message.ts:15`), the three `ReplaceUrl(...)` returns (`src/app.ts:56-77`)
   and the `location.search` read (`src/app.ts:85`). Nothing in Foldkit needs it, and a desktop
   window has no address bar to be bookmarkable from. Persist the preference instead, with a
   Command (Tauri store plugin or `BrowserKeyValueStore`).
2. **Do not pass `routing`** for the shipped app. If a second window or a deep link later needs a
   route, feed it from Tauri's `deep-link` plugin into a Message instead of `popstate`; and never
   handle an External URL with `Navigation.load`/`openUrl` — call the `opener` plugin from a
   Command.
3. **Copy**: bind `Mod+C` and a visible copy button to `h.OnCopyText` (`html/index.js:591`) on the
   focused diff pane, or `Clipboard.writeString` inside the click Command. Never
   `navigator.clipboard.readText`; paste only through `h.OnPastePreventDefault`
   (`html/index.js:581`). The prototype's "⌘C copy" label (`src/variants/b.ts:208`) becomes a real
   `Mod+C`, labelled per platform.
4. **Files**: to accept dropped patches/repos, set `dragDropEnabled: false` in `tauri.conf.json`
   so `h.OnDropFiles` (`html/index.js:689`) receives the `drop`, or take Tauri's native drag-drop
   event and skip the DOM path. Replace `File.select` with the `dialog`/`fs` plugins wherever a
   real path is needed.
5. **Title**: keep `makeApplication`, drop `canonical`/`ogUrl` from the `Document`, and set the OS
   title from a Mount (`getCurrentWindow().setTitle(...)`, needs the `core:window:allow-set-title`
   permission) — or move to `Runtime.makeElement` and own `<head>` not at all. Decide before the
   shell is built; it is the one structural choice.
6. **Keys**: keep `Dom.streamFromKeyBindings` with the default `document` target; `whileTyping:
   'Allow'` for `Escape`/`Mod+K` in the search box; use `j`/`k`/`g`-style sequences for list
   navigation to stay clear of WebView2 accelerators; never bind `Mod+F`/`Mod+P`/`Mod+R`/`F5`.
7. **DevTools**: keep `@foldkit/devtools` in `devDependencies`, never `show: 'Always'`, and add
   the `rg "foldkit-devtools" dist` assert to the desktop build. Skip `devTools.Message` (MCP
   dispatch, dev only).
8. **Cadence**: no timers or animation in the correctness path — rAF and timers are throttled while
   minimised and Tauri cannot disable that on Windows. Git work happens in Commands with
   `Effect`/`Schedule`.
9. **Crash surface**: wrap or replace the built-in crash view before shipping; its only recovery is
   `location.reload()` (`runtime/crashUI.js:163`), which on desktop throws away the session and the
   loaded repository.

## Sources

Foldkit 0.170 and friends, from `prototype/gui/node_modules`:
- `foldkit/dist/`: `runtime/makeApplication.js` (9-27) · `runtime/runtime.js` (43-47, 105,
  131-190) · `runtime/browserListeners.js` (14-71) · `runtime/documentMetadata.js` (3-16, 90-160) ·
  `runtime/devToolsConfig.js` (26-33) · `runtime/devToolsIntegration.js` (131-140) ·
  `runtime/visibility.js:6` · `runtime/renderer.js` (394, 452) · `runtime/viewTransition.js`
  (24-33) · `runtime/crashUI.js:163` · `runtime/scrollPreservation.js` (4-34) ·
  `runtime/start.d.ts` (24-72) · `devTools/webSocketBridge.js` (54-57) · `navigation/index.js`
  (4-23) · `url/index.js` (20-77) · `dom/streamFromKeyBindings.js` (192-211, 382-403) + `.d.ts`
  (52-65) · `dom/dom.js` (159, 257, 371) · `dom/elementMovement.js` (7, 39) ·
  `dom/streamFromMediaQuery.js:37` · `subscription/animationFrame.js` (11-15, 30) ·
  `html/index.js` (581-602, 689-702, 1899-1933) · `html/index.d.ts` (125-132, 1699) ·
  `file/select.js` (2-26) · `file/reader.js:4`
- `@foldkit/vite-plugin/dist/devToolsOverlay.js` (10-15, 70-87, 132-148),
  `@foldkit/vite-plugin/README.md`; `@foldkit/devtools/README.md`;
  `@effect/platform-browser/dist/Clipboard.d.ts` (1-51), `Permissions.d.ts` (1-34)

Docs: <https://foldkit.dev/core/runtime> (page ownership, `makeElement`, `Document`) ·
<https://foldkit.dev/core/devtools> · <https://foldkit.dev/core/routing-and-navigation>

Tauri 2 / wry: <https://v2.tauri.app/reference/config> (`useHttpsScheme`:
"`https://<scheme>.localhost` instead of the default `http://<scheme>.localhost` on Windows and
Android", "the `<scheme>://localhost` protocols used on macOS and Linux"; `dragDropEnabled`;
`backgroundThrottling`; `devtools` = debug builds without the `devtools` feature) · wry
`src/webview2/mod.rs` (`set_webview_settings`: `SetAreDefaultContextMenusEnabled`, conditional
`SetAreBrowserAcceleratorKeysEnabled(false)`; `init_webview`: clipboard-read auto-allow only when
`attributes.clipboard`; `attach_handlers`: `DocumentTitleChanged` opt-in, `NewWindowRequested`
handled-and-dropped without a handler) · <https://github.com/tauri-apps/tauri/issues/7418> ·
<https://v2.tauri.app/plugin/opener> · <https://v2.tauri.app/plugin/clipboard> ·
<https://v2.tauri.app/reference/javascript/api/namespacewindow>
