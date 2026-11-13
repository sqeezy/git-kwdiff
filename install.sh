#!/bin/sh
# Install git-kwdiff into a directory that is on PATH.
#   ./install.sh            -> ~/.local/bin
#   ./install.sh DIR        -> DIR
set -eu

here=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
src="$here/git-kwdiff"
dest=${1:-${HOME:-/root}/.local/bin}

[ -f "$src" ] || { echo "install.sh: $src not found" >&2; exit 1; }

mkdir -p "$dest"
cp "$src" "$dest/git-kwdiff"
chmod +x "$dest/git-kwdiff"
echo "installed: $dest/git-kwdiff"

case ":${PATH:-}:" in
	*":$dest:"*) ;;
	*) echo "note: add $dest to your PATH, then 'git kwdiff -h' works anywhere" ;;
esac
