// Noctua's pane header (28 px): the program's icon, the agent's name or the
// terminal's title, the folder and the agent's status. The focused pane's header
// is lighter (theme hover) with a white name; the rest sit on the chrome color.
// No colored border. On hover: split right, split down, zoom, close.
// Props from the app: { pane, terminal }. Click: focus the pane.
// Corners are 4 px.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, props, run, theme, home, settings } from "herdr";

const R = 4;
const bright = (t) => (settings()?.dark === false ? t.foreground : t.ansi15);

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

function folder(cwd) {
  if (!cwd) return "";
  const h = home();
  return cwd === h ? "~" : cwd.startsWith(h + "/") ? "~" + cwd.slice(h.length) : cwd;
}

export default class Pane extends View {
  init() { this.hovered = false; }

  me() {
    return panes().find((p) => p.pane === props()?.pane);
  }

  button(t, id, icon, command, args) {
    return div()
      .id(id)
      .size(22)
      .flex_none()
      .flex()
      .items_center()
      .justify_center()
      .rounded(R)
      .text_color(t.dim)
      .hover((s) => s.bg(t.input).text_color(bright(t)))
      .on_click((_e, cx) => {
        cx.stop_propagation();
        run(command, args);
      })
      .child(svg(`mods/noctua-pane/${icon}.svg`).size(13));
  }

  render(cx) {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    const on = p.focused;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .pl(10)
      .pr(3)
      .gap(8)
      .items_center()
      .bg(on ? t.raised : t.chrome)
      .border_b(1)
      .border_color(t.border)
      .text_size(12)
      .text_color(t.dim)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(Boolean(pic), (el) => el.child(pic))
      .child(div().flex_none().truncate().max_w(260).font_medium().text_color(on ? bright(t) : t.muted).child(name))
      .child(div().flex_1().min_w(0).truncate().child(folder(p.cwd)))
      .when(st === "working", el => el.child(svg("mods/noctua-chrome/spinner.svg").size(12).flex_none().text_color(t.working).spin(900)))
      .when(st === "blocked", el => el.child(div().flex_none().px(6).h(18).flex().items_center().rounded(R).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).child("Needs you")))
      .when(st === "done", el => el.child(svg("mods/noctua-chrome/check.svg").size(13).flex_none().text_color(t.done)))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
