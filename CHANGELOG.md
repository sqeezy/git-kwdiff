# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[semantic versioning](https://semver.org/).

## [Unreleased]

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
