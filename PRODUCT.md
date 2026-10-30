# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Herdr app layout package: `layouts/<name>.json`, `themes/<name>.json` and, only where a layout field can't do it, mods in gpui-kit JavaScript under `mods/<name>/`. No HTML, CSS or web view at run time; the app draws natively with GPUI. Prototypes in HTML are throwaway.

## Users

The author (GitHub `othavi0`) and anyone who installs the layout from the herdr.dev/layouts gallery. They run several coding agents (Claude Code, Codex) and shells at once in the Herdr app, on Linux (Omarchy/Hyprland) first, and need to see which agent is working, blocked, done or idle without hunting.

## Product Purpose

A Herdr app layout with Noctua themes, consistent with the author's Omarchy theme (github.com/othavi0/omarchy-noctua-theme). Success: it installs from the gallery with one line, reads as the same desktop as the Omarchy Noctua theme, and makes agent status easy to scan.

## Positioning

The Herdr counterpart of an existing, published Omarchy theme: its terminal keeps the One Dark ANSI colors, and the window around it is neutral graphite with no blue, so a Noctua desktop and its Herdr window match.

## Operating Context

- Lives in its own public repo, `othavi0/noctua-one-dark`, with the GitHub topic `herdr-layout`, a `RECIPE.md` and a `preview.png`, per `~/.config/herdr-app/AGENTS.md`.
- Installed into `~/.config/herdr-app/` next to Herdr's shipped layouts; switched with `ctrl-shift-l`.
- The Omarchy theme already themes the herdr TUI through `herdr.toml`; this project covers the Herdr desktop app.

## Capabilities and Constraints

- One layout, `noctua`: a light 4 px radius on controls and selections; panes stay square and flush.
- Only what layout JSON, `themes/*.json` and gpui-kit mods can express. Borders take a single color (no gradient borders). Herdr's shipped layouts and mods are read-only; changes go through clones.
- No colored border on the active tab or the focused pane: the active tab takes the terminal's background, and the focused pane shows in its header. Panes touch the window edges; gaps exist only between split panes.

## Brand Commitments

- Name: Noctua (noctua-one-dark).
- Palette source of truth: `themes/noctua.json`, neutral graphite chosen on 30 October 2026 (canvas `#121212`, chrome `#1a1a1a`, background `#212121`, hover `#262626`, selected `#363636`, text `#c4c4c4` / `#d6d6d6` / `#8f8f8f`, accent light gray `#e0e0e0`). No blue anywhere in the window chrome; status colors (working `#e5c07b`, blocked `#e06c75`, done `#98c379`) and the terminal's ANSI stay One Dark from `~/.config/omarchy/themes/noctua/colors.toml`. Dim text `#8f8f8f` is 5,4:1 on chrome.
- Soft corners: a light 4 px radius on controls and selections, never on the pane edges that touch the window.

## Evidence on Hand

- Omarchy theme files and wallpapers in `~/.config/omarchy/themes/noctua/`.
- No users, installs or gallery listing yet; don't claim any.

## Product Principles

1. Match the Omarchy Noctua desktop before adding anything of its own.
2. Agent status first: a blocked agent must be visible from anywhere in the window.
3. Clean over decorated: thin rules, flat surfaces, no ornament that doesn't carry state.
4. Stay inside what Herdr layouts support natively; a cloned mod has to earn its maintenance.
