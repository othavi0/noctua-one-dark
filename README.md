# Noctua Layout

A dark graphite layout for the [Herdr app](https://herdr.dev), the desktop app for terminals and coding agents. Its terminal keeps the ANSI colors of the [Omarchy Noctua theme](https://github.com/othavi0/omarchy-noctua-theme), and the window around it is neutral gray with no blue.

![Noctua Layout](preview.png)

## What it gives you

- Each space is a card with a two-letter avatar in one of 12 colors from Sanzo Wada's *A Dictionary of Color Combinations*. A new space takes the free color farthest in hue from the ones in use.
- A dot on the avatar shows the agent's state: a red dot when blocked, a green dot when done, a turning yellow arc while working. The card says for how long, such as "waiting 14 min".
- The same dot shows on the tabs, the pane headers and the agents list.
- Cards show the branch, commits ahead and behind, and a button that opens a repo's worktree spaces under it.
- The Changes button on the tab bar counts the lines the shown space adds and removes, such as `+12 −3`.
- The sidebar folds into a 52 px rail of avatars, after T3 Code. Blocked agents stay visible there.
- Tabs carry the session's name. You can pin a space to keep it on top.
- The terminal font, Geist Mono Noctua, is Geist Mono with 88 symbols it lacks (✔ ✖ ⚠ ☑ ⏸ and more) drawn in one cell. Claude Code's checked box reads `[✔]` in green instead of a gray emoji.

[RECIPE.md](RECIPE.md) describes every size, color and behavior, and how the layout is built.

## Install

You need the Herdr app (tested with 0.1.11 on Linux) and `git` on each machine whose spaces should show branches and changes.

### From the gallery

In a Herdr terminal, ask your coding agent:

```
Add the layout herdr.dev/layouts/othavi0/noctua-layout
```

The agent reads the recipe, copies the files into `~/.config/herdr-app` and switches to the layout.

### From this repo

```sh
git clone https://github.com/othavi0/noctua-layout
cd noctua-layout
scripts/install.sh
herdr-app do layout.switch --name noctua
```

`scripts/install.sh` copies `layouts/`, `themes/` and `mods/` into `${HERDR_APP_HOME:-~/.config/herdr-app}`. It writes only names that start with `noctua` and replaces earlier `noctua*` copies whole. Run `scripts/install.sh --dry-run` to see what it would copy.

Press `ctrl-shift-l` to cycle back to your previous layout.

## Update

Pull and run the script again:

```sh
git pull
scripts/install.sh
```

Herdr reloads the mods and the layout live. It reads `themes/noctua.json` again only when the look moves to another layout, so switch to another layout and back, or restart Herdr, to see a changed theme. If the window still shows the old mods, restart Herdr.

## Uninstall

Switch to another layout, then delete the files:

```sh
cd ~/.config/herdr-app
rm -r layouts/noctua.json layouts/noctua.svg themes/noctua.json mods/noctua-*
```

## What the mods run

The mods reach no network. They run these programs on your machine, or on the space's machine for a remote space:

- `noctua-spaces` runs `git status`, `git rev-parse` and `git diff --numstat` in each space's folder, watches each repo's git folder, and runs `hc machine ls` to list your machines.
- `noctua-changes` runs `git` in the focused pane's repo. Its Commit button runs `git add -A` and `git commit`.
- `noctua-files` lists the focused pane's folder with `sh` (`powershell` on Windows) and reads the files you open.

## Rebuild the font

The built font is in `mods/noctua-chrome/fonts/`, so you don't need this to install. To build it again, you need [uv](https://docs.astral.sh/uv/) and Noto Sans Symbols 2 (or Noto Sans Symbols) in `/usr/share/fonts/noto/`:

```sh
scripts/build-font.py --check   # list the symbols it would add
scripts/build-font.py
```

## Credits

- Space colors: Sanzo Wada, *A Dictionary of Color Combinations*.
- Terminal colors: the [Omarchy Noctua theme](https://github.com/othavi0/omarchy-noctua-theme).
- Geist Mono by Vercel and Noto Sans Symbols 2 by Google, both under the SIL Open Font License 1.1. Geist Mono Noctua is a modified Geist Mono under the same license, in [OFL.txt](mods/noctua-chrome/fonts/OFL.txt).
- The folded sidebar follows T3 Code.
- Icons: [Lucide](https://lucide.dev).
- The mods started as copies of Herdr's own `workspace-chrome`, `spaces`, `agents`, `tabs`, `pane`, `files` and `changes` mods.
