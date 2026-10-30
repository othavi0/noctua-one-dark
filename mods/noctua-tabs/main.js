import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, settings } from "herdr";

// Noctua's tab bar: docked tabs (the active one in the terminal's color, no line
// under it), the + menu, Files and Changes on the right. Drag to reorder,
// double-click to rename, right-click for the menu, wheel to switch.
// Corners are 4 px.
const ICONS = "mods/noctua-chrome";
const R = 4;
const bright = (t) => (settings()?.dark === false ? t.foreground : t.ansi15);

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
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      const on = c.active;
      const closable = on || this.hovered === c.id;
      return h_flex().id(`tab-${c.id}`).h_full().min_w(140).flex_none().pl(12).pr(8).gap(8).items_center().text_size(12.5)
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
        .child(div().max_w(170).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.status === "blocked", el => el.child(div().size(14).flex_none().rounded(R).bg(t.blocked + "33").text_size(9).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!")))
        .when(c.status === "working", el => el.child(svg(`${ICONS}/spinner.svg`).size(12).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "done", el => el.child(svg(`${ICONS}/check.svg`).size(13).flex_none().text_color(t.done)))
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
