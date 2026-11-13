---
title: Page ownership
type: grilling
mode: HITL
status: closed
claimed-by: '#6573'
blocked-by: []
---

## Question

Does the window come from `Runtime.makeApplication` — the app owns the document,
its `<head>`, `document.title`, the crash view, and the OS title is pushed to the
window from a Mount — or from `Runtime.makeElement`, which never touches
`<head>` or `<html>`, and we set the native title ourselves?

What hangs off the answer:

- **Title.** `document.title` is not the OS window title in wry unless we wire
  `on_document_title_changed`; either way something must call
  `getCurrentWindow().setTitle(...)`, and `makeElement` has no `Document` to read
  a title from.
- **Crash.** `makeApplication` brings Foldkit's crash view, whose only recovery
  is `location.reload()` — on the desktop that discards the loaded repository.
  Do we keep it, wrap it, or replace it with a "reopen last repository" screen?
- **Head.** `canonical` and `ogUrl` are noise in a window with no crawler; if we
  own `<head>` we must simply not emit them, and hold that line forever.
- **Cost.** `makeElement` is less framework, more code: title, crash, and any
  future document-level concern become ours.

Decide before the shell is built; it changes the entry point and the Mount
surface.

## Resolution

**`Runtime.makeElement`.** The app owns no document: no `<head>`, no
`canonical`/`ogUrl`, no Foldkit crash view. The OS window title is pushed with
`getCurrentWindow().setTitle(...)` when a repository opens (permission
`core:window:allow-set-title`), and a small crash surface owns recovery,
offering "reopen last repository" instead of the built-in `location.reload()`
that would discard the loaded repository and the selection.

Cost accepted: title, crash screen and any future document-level concern are
ours to write.
