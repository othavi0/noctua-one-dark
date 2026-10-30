#!/usr/bin/env bash
# Installs the Noctua layouts, theme and mods into the Herdr app's home.
#   scripts/install.sh            copy into ${HERDR_APP_HOME:-$HOME/.config/herdr-app}
#   scripts/install.sh --dry-run  print what it would copy, change nothing
# It only writes names that start with "noctua": anything else in layouts/,
# themes/ or mods/ stops the install before a single file is copied.
set -euo pipefail

dry=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|-n) dry=1 ;;
    -h|--help) sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "install.sh: unknown option: $arg" >&2; exit 2 ;;
  esac
done

repo=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
dest=${HERDR_APP_HOME:-$HOME/.config/herdr-app}

# Everything this repo installs, as paths relative to the repo.
items=()
for dir in layouts themes mods; do
  [ -d "$repo/$dir" ] || continue
  for path in "$repo/$dir"/*; do
    [ -e "$path" ] || continue
    items+=("$dir/$(basename "$path")")
  done
done

# Refuse before copying anything if a name would touch something that isn't ours.
bad=0
for item in "${items[@]}"; do
  case "$(basename "$item")" in
    noctua*) ;;
    *) echo "install.sh: refusing $item: only noctua* names are installed" >&2; bad=1 ;;
  esac
done
[ "$bad" -eq 0 ] || exit 1
[ "${#items[@]}" -gt 0 ] || { echo "install.sh: nothing to install in $repo" >&2; exit 1; }

say() { if [ "$dry" -eq 1 ]; then echo "would $*"; else echo "$*"; fi; }

[ -d "$dest" ] || say "create $dest"
for item in "${items[@]}"; do
  src=$repo/$item target=$dest/$item
  if [ -e "$target" ]; then say "replace $target"; else say "copy    $target"; fi
  [ "$dry" -eq 1 ] && continue
  mkdir -p "$(dirname "$target")"
  # A mod folder is replaced whole, so files removed here go there too.
  if [ -d "$src" ]; then rm -rf "$target"; cp -R "$src" "$target"; else cp "$src" "$target"; fi
done

if [ "$dry" -eq 1 ]; then
  echo "dry run: nothing written to $dest"
else
  echo "installed into $dest; switch with ctrl-shift-l or: herdr-app do layout.switch --name noctua"
  # Mods and layouts reload live; a theme file is read again only when the look moves to another layout.
  echo "a changed theme shows after switching to another layout and back (or a restart)"
fi
