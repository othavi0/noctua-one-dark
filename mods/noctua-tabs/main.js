import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

// Noctua's tab bar: docked tabs (the active one in the terminal's color, no line
// under it), the + menu, Files and Changes on the right. Drag to reorder,
// double-click to rename, right-click for the menu, wheel to switch.
// Corners are 4 px.
const ICONS = "mods/noctua-chrome";
const R = 4;
// { space, panel, at }: show that panel when that space comes into view.
const OPEN_PANEL = "noctua.panel.open";
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

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

// The tab's name if someone named it, else the title its agent set: the rule of a
// space card's line 2 in noctua-spaces. Paths, user@host and the program's own name
// say nothing, so the program's name stands in for them.
function heading(tab, ps) {
  if (tab.named) return tab.name;
  const mine = ps.filter((p) => p.tab === tab.id && p.terminal);
  const lead = mine.find((p) => p.program?.agent) ?? mine.find((p) => p.focused) ?? mine[0];
  const live = clean(lead?.title);
  const telling = live && live !== lead?.program?.name && !/^[~/]|^[A-Za-z]:\\/.test(live) && !live.includes("@") && live.toLowerCase() !== lead?.program?.key;
  return telling ? live : lead?.program?.name || "";
}

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init() {
    this.pressed = null;
    this.hovered = null;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    // A panel another mod asked for (noctua-spaces' ±), applied once on the render that
    // first sees it: that write and the space switch reach this mod in either order.
    const asked = shared(OPEN_PANEL);
    if (asked?.space === space.id && asked.at !== this.asked && Date.now() - asked.at < 2000 && enabled.includes(asked.panel)) {
      this.asked = asked.at;
      this.space = space.id;
      this.pending = { want: asked.panel, until: Date.now() + 1000 };
      run("layout.select", { stack: "panel-body", child: asked.panel });
      run("layout.show", { id: "panel" });
      return;
    }
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const hi = bright(t);
    const space = spaces().find(p => p.active);
    const shown = space?.tabs ?? [];
    const ps = panes();
    const stop = (_e, cx) => cx.stop_propagation();
    const line = (el) => el.border_b(1).border_color(t.border);
    const button = (id, child, action, tip) => div().id(id).size(28).flex_none().flex().items_center().justify_center().rounded(R).text_color(t.dim)
      .hover(s => s.bg(t.hover).text_color(hi)).when(Boolean(tip), el => el.tooltip(tip))
      .on_mouse_down("left", stop).on_click(action).child(child);
    // A docked tab: the active one takes the terminal's background and no bottom line,
    // so it runs into the pane under it; the rest sit on the bar, 1 px apart.
    const item = (c, i) => {
      const mine = ps.filter(p => p.tab === c.id);
      const program = mine.find(p => p.program?.agent)?.program ?? mine[0]?.program;
      const name = heading(c, ps) || program?.name || "Terminal";
      const on = c.active;
      const closable = on || this.hovered === c.id;
      return h_flex().id(`tab-${c.id}`).h_full().min_w(140).max_w(260).flex_none().pl(12).pr(8).gap(8).items_center().text_size(12.5)
        .border_r(1).border_color(t.border)
        .when(on, el => el.bg(t.background).text_color(t.foreground))
        .when(!on, el => line(el).bg(t.chrome).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.muted)))
        .on_hover((over, cx) => {
          if (over) this.hovered = c.id;
          else if (this.hovered === c.id) this.hovered = null;
          cx.notify();
        })
        .on_mouse_down("left", (e, cx) => { cx.stop_propagation(); this.pressed = i; if (e.click_count === 2) run("tab.rename", { id: c.id }); })
        .on_mouse_up("left", () => {
          const from = this.pressed; this.pressed = null;
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }))
        .child(program?.icon
          ? (program.tint ? svg(program.icon).size(14).flex_none().text_color(on ? t.foreground : t.dim) : image(program.icon).size(14).flex_none())
          : svg(`${ICONS}/terminal.svg`).size(13).flex_none())
        .child(div().flex_shrink(1).min_w(0).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.status && c.status !== "idle", el => el.child(dot(t, c.status, 9)))
        .child(div().flex_1())
        .child(div().id(`close-${c.id}`).size(20).flex_none().flex().items_center().justify_center().rounded(R).text_color(t.dim)
          .when(!closable, el => el.opacity(0))
          .when(closable, el => el.hover(s => s.bg(t.input).text_color(hi))
            .on_mouse_down("left", stop).on_click((_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); }))
          .child(svg(`${ICONS}/x.svg`).size(12)));
    };
    const root = layout(), sidebar = find(root, "sidebar"), w = window();
    // Old saved rails and a dragged-narrow sidebar can be smaller than the window buttons.
    const lightsPadding = w?.platform === "macos" && w.titlebar === "none" && !w.fullscreen && root?.traffic_lights
      ? Math.max(0, (root.traffic_lights[0] + 64) / settings().zoom - (sidebar?.hidden ? 0 : sidebar?.size?.px ?? 0))
      : 0;
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(28).px(10).gap(6).flex_none().items_center().rounded(R)
        .text_size(12.5).border(1).border_color(on ? t.selected : t.chrome).bg(on ? t.selected : t.chrome).text_color(on ? hi : t.muted)
        .hover(s => s.bg(t.hover).text_color(hi)).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(`${ICONS}/${icon}.svg`).size(14)).child(label);
    };
    return h_flex().size_full().min_w(0).items_center().bg(t.chrome)
      .on_mouse_up("left", () => { this.pressed = null; })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .when(lightsPadding > 0, el => el.child(line(div().w(lightsPadding).h_full().flex_none())))
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().overflow_x_scrollbar()
        .children(shown.map(item))
        .child(line(div().flex_1().min_w(0).h_full())))
      .child(line(h_flex().h_full().flex_none().pr(6).gap(2).items_center())
        .child(button("tab-new", svg(`${ICONS}/plus.svg`).size(14), () => openOverlay({ mod: "new-menu", kind: "popup", width: 250, height: 512 }), "New tab"))
        .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "files")))
        .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "git-compare")))
        .when(window()?.buttons, el => el.child(button("minimize", svg(`${ICONS}/minus.svg`).size(14), () => run("window.minimize")))
          .child(button("maximize", svg(`${ICONS}/square.svg`).size(12), () => run("window.maximize")))
          .child(button("close-window", svg(`${ICONS}/x.svg`).size(14), () => run("window.close")))));
  }
}
