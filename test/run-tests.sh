#!/bin/sh
# Tests for git-kwdiff. Nothing needed beyond git and a POSIX sh, so the same
# file runs on Linux, macOS and Git for Windows (CI does all three).
set -u

root=$(CDPATH='' cd -- "$(dirname -- "$0")/.." && pwd)
kwdiff="$root/git-kwdiff"
pass=0
fail=0

ok() { pass=$((pass + 1)); printf 'ok   %s\n' "$1"; }
no() { fail=$((fail + 1)); printf 'FAIL %s\n' "$1"; [ $# -lt 2 ] || printf '     %s\n' "$2"; }

has() { # name, needle, haystack
	case "$3" in
		*"$2"*) ok "$1" ;;
		*) no "$1" "expected to find: $2" ;;
	esac
}

hasnt() { # name, needle, haystack
	case "$3" in
		*"$2"*) no "$1" "did not expect: $2" ;;
		*) ok "$1" ;;
	esac
}

is() { # name, expected, actual
	if [ "$2" = "$3" ]; then ok "$1"; else no "$1" "expected [$2], got [$3]"; fi
}

# --- fixture: two unrelated histories in one repository ----------------------
# main:  feat: alpha keyword  ->  feat: other  ->  docs: no ticket
# side:  fix: keyword beta    ->  fix: keyword gamma   (orphan, no common root)
# then merged, so the history really has two roots and a merge commit.
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
export HOME="$tmp/home"
export GIT_CONFIG_NOSYSTEM=1
mkdir -p "$HOME"
git config --global user.name "Test"
git config --global user.email "test@example.com"
git config --global init.defaultBranch main
git config --global advice.detachedHead false

mkdir "$tmp/repo"
cd "$tmp/repo" || exit 1
git init -q .

echo one > a.txt
git add . && git commit -qm "feat: alpha keyword"

git checkout -q --orphan side
git rm -rfq . 2>/dev/null || true
echo two > b.txt
git add . && git commit -qm "fix: keyword beta"
echo three >> b.txt
git commit -qam "fix: keyword gamma"

git checkout -q main
echo four >> a.txt
git commit -qam "feat: other"
echo "see XYZ-42 for details" >> a.txt
git commit -qam "docs: no ticket"
git merge -q --no-ff --allow-unrelated-histories side \
	-m "merge: keyword side" 2>/dev/null || true

# --- listing ---------------------------------------------------------------
out=$(sh "$kwdiff" -s keyword)
has "finds a commit on the first root" "feat: alpha keyword" "$out"
has "finds commits on the orphan branch" "fix: keyword gamma" "$out"
has "finds the merge commit" "merge: keyword side" "$out"
is "finds exactly four commits" "4" "$(printf '%s\n' "$out" | wc -l | tr -d ' ')"
hasnt "does not match unrelated commits" "feat: other" "$out"

# --- per-commit patches ----------------------------------------------------
diff=$(sh "$kwdiff" keyword 2>/dev/null)
has "patches: shows the added file" "+++ b/a.txt" "$diff"
has "patches: shows the orphan branch file" "+++ b/b.txt" "$diff"
has "patches: labels each commit with its subject" "# fix: keyword gamma" "$diff"
has "patches: merge commit has a real diff" "+three" "$diff"

first=$(printf '%s\n' "$diff" | grep -n 'feat: alpha keyword' | head -1 | cut -d: -f1)
last=$(printf '%s\n' "$diff" | grep -n 'fix: keyword gamma' | head -1 | cut -d: -f1)
if [ "${first:-0}" -lt "${last:-0}" ]; then
	ok "patches come oldest first"
else
	no "patches come oldest first" "alpha at line ${first:-?}, gamma at ${last:-?}"
fi

# --- net diff --------------------------------------------------------------
net=$(sh "$kwdiff" -n keyword 2>/dev/null)
is "net: both files appear once" "2" "$(printf '%s\n' "$net" | grep -c '^+++ b/')"
is "net: the merge did not duplicate a.txt" "1" "$(printf '%s\n' "$net" | grep -c '^+one')"
is "net: b.txt ends with both lines" "2" "$(printf '%s\n' "$net" | grep -c '^+\(two\|three\)')"

# --- paths, options, errors ------------------------------------------------
out=$(sh "$kwdiff" -s keyword -- b.txt)
has "path filter keeps b.txt commits" "fix: keyword beta" "$out"
hasnt "path filter drops a.txt commits" "feat: alpha keyword" "$out"

out=$(sh "$kwdiff" -s -a XYZ-42)
has "-a searches changed lines too" "docs: no ticket" "$out"
sh "$kwdiff" -s XYZ-42 >/dev/null 2>&1
is "without -a, changed lines are ignored" "1" "$?"

sh "$kwdiff" -s nosuchkeyword >/dev/null 2>&1
is "exits 1 when nothing matches" "1" "$?"

sh "$kwdiff" --bogus keyword >/dev/null 2>&1
is "exits 2 on unknown option" "2" "$?"

sh "$kwdiff" -V | grep -q '^git-kwdiff ' && ok "prints a version" || no "prints a version"

sh "$kwdiff" -o "$tmp/out.diff" -s keyword >/dev/null 2>&1
[ -s "$tmp/out.diff" ] && ok "-o writes a file" || no "-o writes a file"

out=$(PATH="$root:$PATH" git kwdiff -s keyword)
has "works as the 'git kwdiff' subcommand" "fix: keyword beta" "$out"

# --- result ----------------------------------------------------------------
printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
