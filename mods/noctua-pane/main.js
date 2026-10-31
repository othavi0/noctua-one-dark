// Noctua's pane header (28 px): the program's icon and name, the space's name in dim,
// the branch with its icon in the space's color, and at the right how long the agent
// has been working and its state dot. The focused pane's header is raised with a
// white name; the rest sit on the chrome color. No colored border. On hover: split
// right, split down, zoom, close. Props from the app: { pane, terminal }. Click: focus
// the pane. Corners are 4 px.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { panes, spaces, props, run, theme, settings, shared } from "herdr";

const ICONS = "mods/noctua-chrome";
const R = 4;
const MONO = "Geist Mono";
const bright = (t) => (settings()?.dark === false ? t.foreground : t.ansi15);

// Agent state, the same table in every Noctua mod: its theme color, the color of
// its time on a card, and how that time reads.
const STATES = {
  blocked: { color: "blocked", tone: "blocked", since: (m) => `waiting ${m}` },
  working: { color: "working", tone: "dim", since: (m) => `working ${m}` },
  done: { color: "done", tone: "done", since: (m) => `done ${m} ago` },
  idle: { color: "idle", tone: "dim", since: null },
};

// The one state mark: a dot (blocked, done), a turning arc (working), a ring (idle).
function dot(t, st, size = 9, spin = size + 2) {
  const color = t[STATES[st]?.color] ?? t.dim;
  if (st === "working") return svg(`${ICONS}/dot-spin.svg`).size(spin).flex_none().text_color(color).spin(900);
  if (st === "idle") return div().size(size).flex_none().rounded_full().border(1.5).border_color(color);
  return st ? div().size(size).flex_none().rounded_full().bg(color) : null;
}

const elapsed = (ms) => {
  const m = Math.floor(ms / 60000);
  return m < 1 ? "<1 min" : m < 60 ? `${m} min` : m < 1440 ? `${Math.floor(m / 60)} h` : `${Math.floor(m / 1440)} d`;
};

// The space's color as noctua-spaces keeps it (shared "space.colors"), lightened 12%.
function branchColor(id, t) {
  const c = (shared("space.colors") ?? {})[id];
  const hex = typeof c === "string" && c.startsWith("#") ? c : t[c] ?? t.dim;
  if (!/^#[0-9a-f]{6}/i.test(hex)) return t.dim;
  return "#" + [1, 3, 5].map((i) => { const v = parseInt(hex.slice(i, i + 2), 16); return Math.round(v + (255 - v) * 0.12).toString(16).padStart(2, "0"); }).join("");
}

function icon(p, size, color) {
  if (!p?.icon) return null;
  return p.tint ? svg(p.icon).size(size).flex_none().text_color(color) : image(p.icon).w(size).h(size).flex_none();
}

export default class Pane extends View {
  init(_props, cx) {
    this.hovered = false;
    // "working 30 min" counts in minutes.
    cx.timer.every(60000, (cx) => cx.notify());
  }

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

  render() {
    const t = theme();
    const p = this.me();
    if (!p) return div();
    const name = ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = icon(p.program, 14, t.dim);
    const st = p.status;
    const pane = p.pane;
    const on = p.focused;
    const space = spaces().find((s) => (s.tabs ?? []).some((c) => c.id === p.tab));
    const since = (space?.tabs ?? []).find((c) => c.id === p.tab)?.working_since;
    return h_flex()
      .id(`pane-head-${pane}`)
      .size_full()
      .pl(10)
      .pr(6)
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
      .child(div().flex_none().truncate().max_w(220).font_medium().text_color(on ? bright(t) : t.muted).child(name))
      .when(Boolean(space), (el) => el.child(div().flex_shrink(1).min_w(0).max_w(200).truncate().child(space.name)))
      .when(Boolean(p.branch), (el) => el.child(h_flex().flex_shrink(1).min_w(0).gap(4).items_center()
        .child(svg(`${ICONS}/git-branch.svg`).size(12).flex_none().text_color(branchColor(space?.id, t)))
        .child(div().min_w(0).truncate().font_family(MONO).text_size(11).child(p.branch))))
      .child(div().flex_1())
      .when(st === "working" && typeof since === "number", (el) => el.child(div().flex_none().font_family(MONO).text_size(11).child(STATES.working.since(elapsed(Date.now() - since)))))
      .when(Boolean(st) && st !== "idle", (el) => el.child(h_flex().w(14).flex_none().justify_center().child(dot(t, st, 9))))
      .when(this.hovered, el => el
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane })));
  }
}
