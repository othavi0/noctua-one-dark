// Noctua's status bar (28 px, under the terminals): the focused pane's folder and its
// git branch. The machine sits in the sidebar footer, on the same line.

import { View, div, svg } from "gpui-kit";
import { h_flex } from "gpui-base";
import { focused, panes, spaces, theme, home } from "herdr";

const ICONS = "mods/noctua-chrome";

function folderName(cwd) {
  if (!cwd) return null;
  if (cwd === home()) return "~";
  return cwd.replace(/\/+$/, "").split("/").pop() || "/";
}

function where() {
  const f = focused();
  const pane = f?.pane ? panes().find((p) => p.pane === f.pane) : null;
  if (pane?.cwd) return { cwd: pane.cwd, branch: pane.branch };
  const space = spaces().find((s) => s.active);
  return { cwd: f?.cwd ?? space?.folder ?? null, branch: space?.branch ?? null };
}

export default class NoctuaStatus extends View {
  render() {
    const t = theme();
    const { cwd, branch } = where();
    const name = folderName(cwd);
    const label = (icon, text) => h_flex().min_w(0).gap(6).items_center()
      .child(svg(`${ICONS}/${icon}.svg`).size(13).flex_none().text_color(t.dim))
      .child(div().truncate().child(text));
    return h_flex().size_full().px(14).gap(14).items_center().bg(t.chrome).border_t(1).border_color(t.border)
      .text_size(12).text_color(t.muted)
      .when(Boolean(name), (el) => el.child(label("folder", name).id("folder").tooltip(cwd)))
      .when(Boolean(branch), (el) => el.child(label("git-branch", branch)));
  }
}
