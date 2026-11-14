# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-11-14

### Added

- kwdiff as a Windows desktop app: Tauri 2 shell, Foldkit 0.170 on Effect
  4.1.4, a three-pane review window.
- Rust git commands (`open_repo`, `refs`, `search`, `cancel_search`, `files`,
  `patch`, `roots`) with fixed argv, no shell, and cancellation that kills the
  previous child.
- 12 story tests over the update loop: ticks, select-all, filters, roots,
  stale results, file-list clamping.
- Windows CI that builds the installer.

### Removed

- The `git-kwdiff` shell subcommand, its tests and its CI. It lives on tag
  `v0.1.0`.

## [0.1.0] - 2026-11-13

### Added

- `git kwdiff <keyword>`: one unified diff for every commit whose message
  matches, across all branches, connected or not.
- `-n`: net cumulative diff, applied in a throwaway index.
- `-a`: also match commits whose changed lines contain the keyword.
- `-s`, `-o FILE`, `-V`.
- Merge commits diffed against their first parent.
- Tests and CI on Linux, macOS and Windows.

[Unreleased]: https://github.com/sqeezy/git-kwdiff/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/sqeezy/git-kwdiff/releases/tag/v0.1.0
