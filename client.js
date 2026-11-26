/**
 * Float Islands — client half.  (V1.3.0-rc.2)
 *
 * Design:
 *  - Two entry sources merged by label:
 *      1. the `sidebar.panellist` slot registry (public API): stable panel
 *         ids, order and labels — survives CSS-module hash changes and still
 *         lists a panel whose native row is not rendered at all (unpinned into
 *         the native "More" menu, collapsed rail, closed drawer);
 *      2. a scan of the REAL native sidebar buttons (footer / account /
 *         workspaces / settings) that the registry does not cover, with their
 *         SVG icons copied once per id.
 *  - Activation prefers the native button (keeps host behaviour: tracking,
 *    popup toggles, analytics) and falls back to ctx.layout.selectPanel(id)
 *    when the row is not in the DOM.
 *  - "Migrated" entries live in the island and can be hidden in the native
 *    sidebar; unselected entries stay in the sidebar untouched.
 *  - Float mode: draggable glass island. Dock mode: a fixed vertical entry
 *    bar pinned to the far left of the sidebar.
 *  - Wallpaper friendly: translucent glass, never paints an opaque canvas.
 *  - Bilingual: runtime copy lives in one dictionary registered with
 *    ctx.locale (zh/en); the package locales only carry store metadata.
 *  - Additive by default: a fresh install never hides the host's navigation.
 */
window.__ModuleLoader__.load({
  id: 'dsh-float-islands',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useRef, useCallback } = React;

    const PKG = 'dsh-float-islands';
    const PREF_KEY = 'dsh-float-islands:prefs';
    const LOCALE_NS = 'floatIslands';

    // ---------- i18n ----------
    // Runtime copy. locale/en.json + locale/zh.json hold only the package display
    // metadata the host's plugin list reads (meta.title/description/detail);
    // these dictionaries are registered with ctx.locale at apply time.
    const TEXT = {
      zh: {
        title: '浮岛栏',
        empty: '未选择入口',
        gripDocked: '吸附中',
        gripDockedHint: '点击展开 · 拖动可移动',
        gripFloat: '自由浮岛',
        gripFloatHint: '点击吸附到左侧栏 · 拖动可移动',
        resizeTitle: '拖动调整列数',
        cols: '{n} 列',
        colsRow: '一行 {n} 列',
        colsRowLast: '一行 {n} 列（单行）',
        migrationTitle: '入口迁移',
        migrationHint: '勾选要移入浮岛的入口；未勾选的保留在原生侧栏。改动后请点下方「保存」。',
        selectAll: '全选',
        selectNone: '全不选',
        restoreDefault: '还原默认',
        migrateAria: '迁移 {name}',
        enable: '启用浮岛栏',
        enableHint: '关闭后恢复原生界面',
        dock: '吸附到左侧栏',
        dockHint: '开启后浮岛固定为左栏左边的独立入口栏（不可拖动）',
        hideMigrated: '隐藏已迁移的原生入口',
        hideMigratedHint: '选中的入口进浮岛后从原生侧栏隐藏；未选中的保留',
        glass: '毛玻璃效果',
        glassHint: '壁纸引擎启用时自动使用更轻的玻璃层',
        showLabels: '显示入口名称',
        showLabelsHint: '关闭后只显示图标，hover 显示名称',
        position: '停靠位置',
        left: '左侧',
        right: '右侧',
        offset: '距边缘距离（px）',
        posTitle: '浮岛位置',
        posHint: '拖动后保存的位置；拖出屏幕可在这里复位',
        resetPos: '复位位置',
        size: '图标尺寸',
        small: '小',
        medium: '中',
        large: '大',
        colsTitle: '浮岛列数',
        colsHint: '拖动浮岛右侧边框可快速切换；1 列为竖排，最大为全部一行',
        cancel: '取消',
        saveMigration: '保存入口迁移',
        onboardTitle: '首次使用',
        onboardHint: '默认不隐藏原生入口，浮岛与原生侧栏并存。觉得顺手后再一键收起。',
        onboardAction: '收起原生入口',
        onboardLater: '以后再说',
      },
      en: {
        title: 'Float Islands',
        empty: 'No entries selected',
        gripDocked: 'Docked',
        gripDockedHint: 'Click to expand · drag to move',
        gripFloat: 'Floating',
        gripFloatHint: 'Click to dock on the left · drag to move',
        resizeTitle: 'Drag to change the column count',
        cols: '{n} cols',
        colsRow: 'One row, {n} cols',
        colsRowLast: 'One row, {n} cols (single line)',
        migrationTitle: 'Entry migration',
        migrationHint: 'Tick the entries to move into the island; unticked ones stay in the native sidebar. Click Save below to apply.',
        selectAll: 'All',
        selectNone: 'None',
        restoreDefault: 'Reset to default',
        migrateAria: 'Migrate {name}',
        enable: 'Enable Float Islands',
        enableHint: 'Turn off to restore the native interface',
        dock: 'Dock to the left rail',
        dockHint: 'Pins the island as a fixed rail left of the sidebar (not draggable)',
        hideMigrated: 'Hide migrated native entries',
        hideMigratedHint: 'Migrated entries disappear from the native sidebar; unticked ones stay',
        glass: 'Frosted glass',
        glassHint: 'Uses the lighter glass layer while a wallpaper engine is active',
        showLabels: 'Show entry names',
        showLabelsHint: 'Off shows icons only; names appear on hover',
        position: 'Side',
        left: 'Left',
        right: 'Right',
        offset: 'Edge offset (px)',
        posTitle: 'Island position',
        posHint: 'Position saved after dragging; reset it here if it left the screen',
        resetPos: 'Reset position',
        size: 'Icon size',
        small: 'Small',
        medium: 'Medium',
        large: 'Large',
        colsTitle: 'Island columns',
        colsHint: 'Drag the right edge to change it; 1 column is a vertical strip, the maximum puts everything in one row',
        cancel: 'Cancel',
        saveMigration: 'Save migration',
        onboardTitle: 'First run',
        onboardHint: 'The native sidebar is left untouched by default, so both stay usable. Collapse it in one click once the island feels right.',
        onboardAction: 'Hide native entries',
        onboardLater: 'Later',
      },
    };
    // Replaced with ctx.locale.bind(LOCALE_NS) in apply(); until then (and
    // whenever the host has no locale service) Chinese copy keeps working.
    let t = (key) => TEXT.zh[key];
    function tr(key, vars) {
      let text;
      try { text = t(key); } catch (e) { text = undefined; }
      if (typeof text !== 'string' || !text) text = TEXT.zh[key];
      if (typeof text !== 'string' || !text) text = key;
      if (vars) {
        for (const name of Object.keys(vars)) text = text.split('{' + name + '}').join(String(vars[name]));
      }
      return text;
    }
    // Host menu item we must click to reach Settings (the account menu's row).
    // Matched on trimmed text so the host's own shortcut suffix is ignored, and
    // without a trailing word boundary so CJK text right after it still matches.
    const SETTINGS_ITEM = new RegExp('^(设置|Settings)(?![A-Za-z])', 'i');
    // Our own section title, so the fallback never clicks our own settings row.
    const SELF_LABEL = /浮岛栏|Float Islands/i;
    const ACCOUNT_LABEL = /账号菜单|账户|account/i;

    // ---------- preferences ----------
    const DEFAULTS = {
      _v: 16,                // schema version; see MIGRATIONS below
      cols: 1,               // island layout columns: 1..N (N = all in one row)
      pos: null,             // {x,y} from dragging in float mode
      enabled: true,
      dockMode: 'docked',    // 'float' | 'docked' — dock by default (native sidebar shifts right)
      // null = default rule: migrate everything EXCEPT new-session & account.
      // An array = the explicit ids the user selected to migrate.
      migrated: null,
      // Additive by default: a fresh install shows the island *next to* the
      // native sidebar. Hiding the host's own navigation is opt-in (settings
      // page or the first-run row), never a surprise on first launch.
      hideMigrated: false,
      glass: true,
      position: 'left',      // float side: left | right
      offset: 268,
      order: [],
      hidden: [],            // hidden from the island itself
      size: 'md',
      showLabels: true,
      onboarded: false,      // false -> settings shows the one-time first-run row
    };
    // Versioned preference migrations. A stored schema is upgraded step by step
    // instead of being thrown away: the old code reset every preference on any
    // version bump, which wiped a user's layout on each release.
    const MIGRATIONS = {
      15: (p) => ({
        ...p,
        _v: 16,
        // Users on 15 already lived with hiding on by default — keep whatever
        // they had (true if the stored object predates the field) and treat
        // them as onboarded so the first-run row never appears.
        hideMigrated: p.hideMigrated === undefined ? true : p.hideMigrated,
        onboarded: true,
      }),
    };
    function upgradePrefs(parsed) {
      let out = parsed;
      for (let i = 0; i < 16 && Number(out._v) < DEFAULTS._v; i++) {
        const step = MIGRATIONS[Number(out._v)];
        if (!step) return null;
        const next = step(out);
        if (!next || next === out) return null;
        out = next;
      }
      return Number(out._v) === DEFAULTS._v ? out : null;
    }
    let memoryPrefs = { ...DEFAULTS };
    function loadPrefs() {
      try {
        const raw = localStorage.getItem(PREF_KEY);
        if (!raw) return { ...DEFAULTS };
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS };
        if (Number(parsed._v) > DEFAULTS._v) {
          // Downgrade: keep what we understand instead of resetting.
          return { ...DEFAULTS, ...parsed, _v: DEFAULTS._v };
        }
        const upgraded = upgradePrefs(parsed);
        if (!upgraded) {
          console.warn(PKG, 'unknown prefs schema', parsed._v, '- falling back to defaults');
          return { ...DEFAULTS };
        }
        return { ...DEFAULTS, ...upgraded };
      } catch { return { ...memoryPrefs }; }
    }
    function savePrefs(p) {
      memoryPrefs = p;
      try { localStorage.setItem(PREF_KEY, JSON.stringify(p)); } catch (e) {}
      emitPrefs(p);
    }
    const prefsListeners = new Set();
    function emitPrefs(p) { for (const fn of prefsListeners) fn(p); }
    function usePrefs() {
      const [p, set] = useState(loadPrefs);
      useEffect(() => {
        const fn = (v) => set({ ...v });
        prefsListeners.add(fn);
        return () => prefsListeners.delete(fn);
      }, []);
      return [p, (patch) => savePrefs({ ...loadPrefs(), ...patch })];
    }

    // ---------- shared entry store (scanner <-> island <-> settings) ----------
    let currentEntries = [];
    let entriesSignature = '';
    const entryListeners = new Set();
    function publishEntries(list, domCount) {
      // A scan that finds no native row at all is almost always a transient
      // state (sidebar unmounted for a route swap, drawer closed, collapsed
      // rail), not a user decision. Publishing it would blank the island and
      // silently drop the settings draft, so keep the last known entries.
      const fromDom = typeof domCount === 'number' ? domCount : list.length;
      if (currentEntries.length > 0 && (list.length === 0 || fromDom === 0)) return;
      // Notify subscribers only when the content really changed: the old code
      // published a fresh array on every mutation, re-rendering the island and
      // the settings page dozens of times per second while a reply streamed.
      const signature = list.map((e) =>
        e.id + (e.panelId ? '@' + e.panelId : '') + (e.svg ? '+' + e.svg.length : '-')).join('|');
      if (signature === entriesSignature && currentEntries.length === list.length) return;
      entriesSignature = signature;
      currentEntries = list;
      for (const fn of entryListeners) fn(list);
    }
    function useEntries() {
      const [v, set] = useState(currentEntries);
      useEffect(() => {
        const fn = (list) => set([...list]);
        entryListeners.add(fn);
        return () => entryListeners.delete(fn);
      }, []);
      return v;
    }

    // ---------- wallpaper coexistence ----------
    function useWallpaperActive() {
      const read = () => typeof document !== 'undefined' &&
        (document.body?.hasAttribute('data-we-wallpaper') ||
         document.documentElement?.hasAttribute('data-dsh-skin'));
      const [active, setActive] = useState(read);
      useEffect(() => {
        if (typeof MutationObserver === 'undefined' || !document.body) return;
        const mo = new MutationObserver(() => setActive(read()));
        mo.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['data-we-wallpaper', 'data-dsh-skin'],
          subtree: true,
        });
        return () => mo.disconnect();
      }, []);
      return active;
    }

    // ---------- styles ----------
    const CSS = `
/* Float Islands — scoped. Never paints an opaque canvas. */
@keyframes fi-pop { from { transform: translateY(6px) scale(.96); opacity: 0 } to { transform: none; opacity: 1 } }
.fi-root {
  --fi-blur: 18px;
  --fi-bg: color-mix(in srgb, var(--dsw-alias-bg-overlay, rgba(30,32,38,.85)) 72%, transparent);
  --fi-border: var(--dsw-alias-border-l1, rgba(255,255,255,.12));
  --fi-fg: var(--dsw-alias-label-primary, #e8e8ea);
  --fi-fg2: var(--dsw-alias-label-secondary, #9aa0a6);
  --fi-brand: var(--dsw-alias-brand-primary, #4f7cff);
  position: fixed; top: 50%; transform: translateY(-50%);
  /* Keep the island below modal dialogs (session-manager overlay uses z-index
     1050). A too-high z-index sat above other plugins' popup layers. */
  z-index: 900; pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(var(--fi-cols, 1), var(--fi-tile, 44px));
  gap: 8px; width: max-content;
  max-height: calc(100vh - 24px); overflow: auto;
  scrollbar-width: none;
  transition: grid-template-columns .3s cubic-bezier(.22,1,.36,1), width .3s cubic-bezier(.22,1,.36,1), height .3s cubic-bezier(.22,1,.36,1), border-radius .3s ease;
  /* During grip-drag / edge-resize every pointer move would restart the .3s
     transition above, so the island visibly stutters. Kill transitions for
     the duration of the gesture and use compositor-friendly transforms. */
  padding: 10px 8px; border-radius: 20px;
  background: var(--fi-bg); border: 1px solid var(--fi-border);
  box-shadow: 0 10px 34px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.07);
  backdrop-filter: blur(var(--fi-blur)) saturate(140%);
  -webkit-backdrop-filter: blur(var(--fi-blur)) saturate(140%);
  animation: fi-pop .22s ease-out;
  color: var(--fi-fg); font-family: inherit; user-select: none;
}
.fi-root::-webkit-scrollbar { display: none; }
/* Dragging: position is driven by --fi-dx / --fi-dy custom properties, which
   React's style diffing never touches — a re-render mid-drag therefore cannot
   clobber the live position (that caused the "snap back then catch up" judder).
   The frosted glass is intentionally NOT downgraded: the lag came from event
   delivery + layout reads, not from backdrop-filter. */
.fi-root.fi-dragging {
  transition: none !important;
  transform: translate3d(var(--fi-dx, 0px), var(--fi-dy, 0px), 0) !important;
  will-change: transform;
}
/* While the island is travelling under the pointer, tiles must not re-enter
   :hover (that repainted the glass and re-triggered tooltips every frame). The
   grip keeps pointer-events so the captured drag keeps receiving moves. */
.fi-root.fi-dragging .fi-tile,
.fi-root.fi-dragging .fi-tip,
.fi-root.fi-dragging .fi-label,
.fi-root.fi-dragging .fi-sep,
.fi-root.fi-dragging .fi-empty { pointer-events: none !important; }
/* Column resize only needs the transition suppressed; it must NOT get the
   drag transform (that would cancel the float centering). */
.fi-root.fi-resize-gesture { transition: none !important; }
body.fi-dragging-body { user-select: none !important; }
.fi-root.fi-solid { backdrop-filter: none; -webkit-backdrop-filter: none; background: var(--dsw-alias-bg-layer-1, #1e1e22); }
.fi-root.fi-right { left: auto; }
.fi-root.fi-sm { --fi-tile: 38px; padding: 8px 6px; gap: 6px; }
.fi-root.fi-md { --fi-tile: 44px; }
.fi-root.fi-lg { --fi-tile: 52px; padding: 12px 9px; gap: 10px; }

/* Docked: a fixed vertical entry bar at the far-left; native sidebar shifts right. */
.fi-root.fi-docked {
  --fi-dock-w: 62px;
  display: flex; flex-direction: column; align-items: center;
  left: 0 !important; right: auto !important;
  top: var(--fi-dock-top) !important;
  transform: none !important;
  height: calc(100vh - var(--fi-dock-top)) !important;
  max-height: calc(100vh - var(--fi-dock-top)) !important;
  width: var(--fi-dock-w); box-sizing: border-box;
  border-radius: 0 18px 18px 0; padding: 14px 7px;
  justify-content: flex-start; gap: 10px;
  border-left: 0; overflow-y: auto;
  --fi-tile: 44px;
}
.fi-root.fi-docked.fi-sm { --fi-dock-w: 54px; --fi-tile: 38px; }
.fi-root.fi-docked.fi-lg { --fi-dock-w: 72px; --fi-tile: 52px; }
/* Dock mode keeps the grip visible: drag it to undock & free-move. */
.fi-root.fi-docked .fi-grip { margin-bottom: 2px; }
.fi-root.fi-docked::after {
  content: ''; position: absolute; right: -1px; top: 12%; height: 76%; width: 2px;
  border-radius: 2px; background: var(--fi-brand); opacity: .35;
}
.fi-dock-label { font-size: 9px; color: var(--fi-fg2); text-align: center; letter-spacing: 1px; padding: 0 0 4px; }
/* Push the whole AppFrame right by the dock width. The frame is the grid
   container (class contains _frame) inside data-slot=root. Margin + width
   keeps the grid columns intact and clears the dock. */
body[data-fi-docked="1"] [data-slot="root"] > div[class*="_frame"],
body[data-fi-docked="1"] #root > div[class*="_frame"] {
  margin-left: 62px !important;
  width: calc(100% - 62px) !important;
}
body[data-fi-docked="1"].fi-dock-sm [data-slot="root"] > div[class*="_frame"] { margin-left: 54px !important; width: calc(100% - 54px) !important; }
body[data-fi-docked="1"].fi-dock-lg [data-slot="root"] > div[class*="_frame"] { margin-left: 72px !important; width: calc(100% - 72px) !important; }
/* When all panel entries migrated, tighten the dead space between the
   new-session row and the workspace region. */
/* panelList fully migrated: remove its box AND trailing margin (was h=10+mb=8). */
body.fi-panels-collapsed [data-slot="sidebar"] [class*="_panelList"],
body.fi-panels-collapsed [data-slot="sidebar"] nav[aria-label] { display: none !important; margin: 0 !important; }
body.fi-panels-collapsed [data-slot="sidebar"] [class*="_scrollRegion"] { padding-top: 0 !important; margin-top: 0 !important; }
body.fi-panels-collapsed [data-slot="sidebar"] [class*="_newSessionRow"] { margin-bottom: 0 !important; }
/* Thoroughly remove leftover vertical space in the native sidebar once
   entries are migrated. Compress only spacing — never hide lists with content. */
body.fi-native-compact [data-slot="sidebar"] [class*="_newSessionRow"] { margin: 2px 0 !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_panelList"]:empty { display: none !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_scrollRegion"] { padding-top: 0 !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_scrollArea"] { gap: 0 !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_scrollFade"] { display: none !important; }
/* Foot zone: collapse the gap between the last kept row and the account row. */
body.fi-native-compact [data-slot="sidebar"] [class*="_footArea"] { gap: 0 !important; margin-top: 0 !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_footerActions"]:empty { display: none !important; }
body.fi-native-compact [data-slot="sidebar"] [class*="_settingsArea"] { margin-top: 0 !important; }
/* Region area (workspace list) should not stretch when content is short;
   accounts then sit right below the last workspace row. */
body.fi-native-compact [data-slot="sidebar"] [class*="_regionArea"] { flex: 0 1 auto !important; }

.fi-tile {
  width: var(--fi-tile, 44px); min-height: var(--fi-tile, 44px);
  display: flex; align-items: center; justify-content: center;
  flex-direction: column; gap: 2px;
  border: 0; border-radius: 13px; background: transparent;
  color: var(--fi-fg2); cursor: pointer; position: relative;
  transition: background .15s, color .15s, transform .1s; padding: 4px;
}
.fi-tile:hover { background: color-mix(in srgb, var(--fi-fg) 10%, transparent); color: var(--fi-fg); }
.fi-tile:active { transform: scale(.93); }
.fi-tile.fi-active { background: color-mix(in srgb, var(--fi-brand) 20%, transparent); color: var(--fi-brand); }
.fi-tile.fi-active::before {
  content: ''; position: absolute; left: -8px; top: 50%; transform: translateY(-50%);
  width: 3px; height: 20px; border-radius: 2px; background: var(--fi-brand);
}
.fi-tile svg, .fi-svg svg { width: 20px; height: 20px; display: block; pointer-events: none; }
.fi-svg { display: inline-flex; align-items: center; justify-content: center; }
.fi-label { font-size: 9px; line-height: 1; max-width: 48px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fi-tip {
  position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
  background: var(--dsw-alias-bg-overlay, #222); color: var(--dsw-alias-label-primary, #fff);
  border: 1px solid var(--fi-border); border-radius: 7px; padding: 4px 8px;
  font-size: 11px; white-space: nowrap; pointer-events: none; opacity: 0;
  transition: opacity .12s; box-shadow: 0 4px 14px rgba(0,0,0,.25);
}
.fi-root.fi-right .fi-tip { left: auto; right: calc(100% + 12px); }
.fi-tile:hover .fi-tip { opacity: 1; }
.fi-sep { width: 60%; height: 1px; margin: 1px auto; background: var(--fi-border); }
/* In grid (float) mode the grip & separators span the full row; they only
   render in single-column/dock anyway but this keeps the grid tidy. */
.fi-root:not(.fi-docked) .fi-grip,
.fi-root:not(.fi-docked) .fi-sep,
.fi-root:not(.fi-docked) .fi-empty { grid-column: 1 / -1; }
.fi-empty { font-size: 10px; color: var(--fi-fg2); text-align: center; padding: 4px; }
/* Resize handle on the right edge: drag horizontally to change column count. */
.fi-resize {
  position: absolute; top: 0; right: -3px; width: 8px; height: 100%;
  cursor: ew-resize; z-index: 5; border-radius: 4px;
  transition: background .18s ease, box-shadow .18s ease;
}
.fi-resize::after {
  content: ''; position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 3px; height: 28px; border-radius: 3px;
  background: var(--fi-fg2); opacity: .45;
  transition: opacity .18s ease, height .18s ease, background .18s ease;
}
.fi-resize:hover, .fi-resize.fi-resizing { background: color-mix(in srgb, var(--fi-brand) 18%, transparent); }
.fi-resize:hover::after, .fi-resize.fi-resizing::after { opacity: 1; height: 42px; background: var(--fi-brand); }
.fi-root.fi-docked .fi-resize { right: -3px; top: 12%; height: 76%; }
.fi-resize-hint {
  position: fixed; z-index: 2147483000; pointer-events: none;
  background: var(--fi-bg, rgba(30,32,38,.92)); color: var(--fi-fg, #e8e8ea);
  border: 1px solid var(--fi-border, rgba(255,255,255,.12)); border-radius: 8px;
  padding: 4px 10px; font: 11px/1.4 inherit;
  opacity: 0; transform: translate(-50%, -140%) scale(.94);
  transition: opacity .16s ease, transform .16s ease;
  box-shadow: 0 8px 22px rgba(0,0,0,.4);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
}
.fi-resize-hint.fi-show { opacity: 1; transform: translate(-50%, -140%) scale(1); }
/* Grip: plain ⠿ handle (V1.1.0 look). Click toggles dock, drag moves. */
.fi-grip {
  cursor: grab; text-align: center; font-size: 10px;
  color: var(--fi-fg2); letter-spacing: 2px; padding: 2px 0 4px;
  position: relative; border-radius: 10px;
}
.fi-grip:active { cursor: grabbing; }
.fi-grip:hover { color: var(--fi-fg); }
/* Grip tooltip is portaled to <body> (see fi-portal-tip) because the island's
   overflow clips any absolutely positioned child. Fixed positioning escapes it. */
.fi-portal-tip {
  position: fixed; z-index: 2147483000;
  background: var(--fi-bg, rgba(30,32,38,.9));
  color: var(--fi-fg, #e8e8ea);
  border: 1px solid var(--fi-border, rgba(255,255,255,.12));
  border-radius: 10px; padding: 9px 12px;
  min-width: 150px; max-width: 260px; text-align: left;
  font-family: inherit; font-size: 11px; line-height: 1.5; letter-spacing: 0;
  pointer-events: none; opacity: 0;
  transform: translateY(-50%) translateX(-6px);
  transition: opacity .16s ease, transform .16s ease;
  box-shadow: 0 12px 30px rgba(0,0,0,.45), inset 0 1px 0 rgba(255,255,255,.07);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
}
.fi-portal-tip.fi-show { opacity: 1; transform: translateY(-50%) translateX(0); }
.fi-portal-tip b { display: block; font-weight: 600; font-size: 11px; color: inherit; }
.fi-portal-tip small { display: block; font-size: 10px; color: var(--fi-fg2, #9aa0a6); margin-top: 2px; white-space: nowrap; }

/* Settings page */
.fi-settings { display: flex; flex-direction: column; gap: 14px; width: 100%; color: var(--dsw-alias-label-primary); }
.fi-settings h3 { margin: 0 0 2px; font-size: 14px; }
.fi-settings .fi-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--dsw-alias-border-l1); }
.fi-settings .fi-row:last-child { border-bottom: 0; }
.fi-row-title { font-size: 14px; line-height: 20px; color: var(--dsw-alias-label-primary); }
.fi-settings .fi-hint { font-size: 11px; color: var(--dsw-alias-label-secondary); margin-top: 2px; }
.fi-entry-toolbar { display: flex; gap: 8px; padding: 8px 0 4px; }
/* Bottom action bar: pinned on top of the scrolling options, fills the
   full panel width, opaque so rows scrolling underneath are not visible. */
.fi-actions {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 24px; margin: 10px -24px -24px;
  position: sticky; bottom: -24px; z-index: 50;
  /* Opaque backdrop: resolve the alias token over a solid base so rows
     scrolling underneath are fully hidden. */
  background: color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e22) 100%, #000);
  border-top: 1px solid var(--dsw-alias-border-l1);
  box-shadow: 0 -10px 22px -8px rgba(0,0,0,.75);
}
.fi-actions .fi-btn { flex: 1 1 0; text-align: center; }
.fi-actions::before {
  content: ''; position: absolute; inset: -18px 0 100%;
  background: linear-gradient(to top,
    color-mix(in srgb, var(--dsw-alias-bg-layer-2, #1e1e22) 100%, #000), transparent);
  pointer-events: none;
}
.fi-btn {
  font: inherit; font-size: 13px; line-height: 20px;
  padding: 6px 18px; border-radius: 8px; cursor: pointer;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary);
}
.fi-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--fi-fg) 8%, var(--dsw-alias-bg-layer-2)); }
.fi-btn:disabled { opacity: .45; cursor: default; }
.fi-btn-primary { background: var(--dsw-alias-brand-primary); border-color: var(--dsw-alias-brand-primary); color: #fff; }
.fi-btn-primary:hover:not(:disabled) { filter: brightness(1.08); background: var(--dsw-alias-brand-primary); }
.fi-switch { appearance: none; width: 38px; height: 22px; border-radius: 11px; background: var(--dsw-alias-border-l2); position: relative; cursor: pointer; transition: background .15s; flex: none; }
.fi-switch::after { content: ''; position: absolute; width: 16px; height: 16px; left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: transform .15s; }
.fi-switch:checked { background: var(--dsw-alias-brand-primary); }
.fi-switch:checked::after { transform: translateX(16px); }
.fi-select, .fi-input { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); border: 1px solid var(--dsw-alias-border-l1); border-radius: 7px; padding: 4px 8px; font: inherit; font-size: 12px; line-height: 18px; }
.fi-input { width: 84px; text-align: right; }
.fi-select { min-width: 84px; }
.fi-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; margin: 2px; border-radius: 12px; border: 1px solid var(--dsw-alias-border-l1); font-size: 11px; cursor: pointer; background: transparent; color: var(--dsw-alias-label-primary); }
.fi-chip.fi-on { border-color: var(--fi-brand); color: var(--fi-brand); background: color-mix(in srgb, var(--fi-brand) 12%, transparent); }
.fi-chip.fi-off { opacity: .55; }
.fi-group { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 6px; }
.fi-mini { font-size: 11px; padding: 3px 10px; border-radius: 8px; border: 1px solid var(--dsw-alias-border-l1); background: transparent; color: var(--dsw-alias-label-primary); cursor: pointer; }
/* Entry migration rows: 2-column grid; icon + name left, checkbox right. */
.fi-entry-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; margin-top: 8px; }
.fi-entry-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 10px; border-radius: 8px; cursor: pointer;
  border: 1px solid transparent;
}
.fi-entry-row:hover { background: color-mix(in srgb, var(--fi-fg) 6%, transparent); }
.fi-entry-row.fi-on { border-color: color-mix(in srgb, var(--fi-brand) 40%, transparent); }
.fi-entry-name { display: inline-flex; align-items: center; gap: 9px; font-size: 13px; color: var(--dsw-alias-label-primary); }
.fi-entry-name .fi-svg { display: inline-flex; width: 18px; height: 18px; }
.fi-entry-name .fi-svg svg { width: 18px; height: 18px; }
.fi-entry-fallback {
  display: inline-flex; align-items: center; justify-content: center;
  width: 18px; height: 18px; font-size: 12px; color: var(--dsw-alias-label-secondary);
}
`;

    // ---------- helpers ----------
    function initialCaps(s) {
      if (!s) return '?';
      const map = { schedules: '⏰', plugins: '🧩', files: '📁', tasks: '✅', chat: '💬', editor: '📝', changes: '🔀', terminal: '⌨️' };
      return map[s] ?? String(s).trim().charAt(0).toUpperCase();
    }
    function labelOf(entry) {
      const l = entry && entry.label;
      return (typeof l === 'string' && l) ? l : (entry ? entry.id : '');
    }
    // Entries excluded by default: new session, account menu, and the
    // cost-meter "今日" card (local preference: never auto-migrate it).
    function isDefaultExcluded(entry) {
      const s = (entry.id || '') + ' ' + (entry.label || '');
      return /新会话|新建会话|new\s*session|account|账号|账户|今日/i.test(s);
    }
    function defaultMigratedIds(entries) {
      return entries.filter((e) => !isDefaultExcluded(e)).map((e) => e.id);
    }
    function isMigrated(entry, prefs) {
      if (Array.isArray(prefs.migrated)) return prefs.migrated.includes(entry.id);
      // Default rule: everything except new-session & account.
      return !isDefaultExcluded(entry);
    }

    // ---------- panel registry channel (public API) ----------
    // `sidebar.panellist` is the sidebar's own source of truth for its panel
    // rows: id, order and label, independent of the rendered DOM. It costs one
    // call to read, keeps working across CSS-module hash changes, and still
    // lists a panel whose row is not rendered at all.
    let slotsService = null;
    let panelRegistry = [];
    let panelIdByLabel = new Map();

    function readPanelRegistry() {
      if (!slotsService || typeof slotsService.entriesOfSlot !== 'function') return [];
      let stored = [];
      try { stored = slotsService.entriesOfSlot('sidebar.panellist') || []; }
      catch (err) { console.warn(PKG, 'entriesOfSlot(sidebar.panellist) failed', err); return []; }
      const out = [];
      for (const item of stored) {
        const opts = item && item.options;
        const id = opts ? opts.id : null;
        if (typeof id !== 'string' || !id) continue;
        const raw = opts.label;
        let label = '';
        try { label = typeof raw === 'function' ? raw() : raw; } catch (e) { label = ''; }
        out.push({
          panelId: id,
          label: (typeof label === 'string' && label) ? label : id,
          order: Number(opts.order) || 0,
        });
      }
      return out;
    }
    function refreshPanelRegistry() {
      panelRegistry = readPanelRegistry();
      const byLabel = new Map();
      for (const p of panelRegistry) if (!byLabel.has(p.label)) byLabel.set(p.label, p.panelId);
      panelIdByLabel = byLabel;
      return panelRegistry;
    }

    // ---------- entry scanner ----------
    const buttonsRef = new Map();
    // id -> last SVG markup seen in the sidebar. A panel that gets unpinned
    // into the native More menu keeps its icon instead of falling back to a
    // letter, because the row (and its <svg>) is gone from the DOM.
    const iconCache = new Map();
    let scannerObserver = null;
    let observedRoot = null;
    let scanFrame = 0;

    // Explicit selectors. The previous version appended " button" to every
    // zone, which turned the trigger zone into `button[class*="_trigger"] button`
    // — a descendant selector that can never match, so that zone was dead.
    const ZONES = [
      '[data-slot="sidebar"] nav[aria-label] button',
      '[data-slot="sidebar"] [class*="_panelList"] button',
      '[data-slot="sidebar"] [class*="_footArea"] button',
      '[data-slot="sidebar"] [class*="_settingsArea"] button',
      '[data-slot="sidebar"] [class*="_newSessionRow"] button',
      '[data-slot="sidebar"] button[class*="_trigger"]',
      '[data-slot="sidebar"] [data-slot="settings.launcher"] button',
    ];

    function scanSidebar() {
      try {
        const sidebar = document.querySelector('[data-slot="sidebar"]');
        if (!sidebar) return;
        refreshPanelRegistry();
        let nodes = [];
        for (const z of ZONES) {
          try { nodes.push(...sidebar.querySelectorAll(z)); } catch (e) {}
        }
        nodes = [...new Set(nodes)];
        const list = [];
        const seen = new Set();
        for (const btn of nodes) {
          // Session rows carry per-row icon buttons; they are not entries.
          if (typeof btn.closest === 'function' && btn.closest('[data-row-key]')) continue;
          const label = btn.getAttribute('aria-label') || btn.getAttribute('title') || (btn.textContent || '').trim();
          if (!label) continue;
          if (btn.hasAttribute('data-sidebar-toggle') || /取消固定|unpin/i.test(label)) continue;
          const key = btn.getAttribute('aria-label') || label;
          if (seen.has(key)) continue;
          seen.add(key);
          buttonsRef.set(key, btn);
          const svg = btn.querySelector('svg')?.outerHTML || null;
          if (svg) iconCache.set(key, svg);
          list.push({
            id: key,
            label,
            svg: svg || iconCache.get(key) || null,
            panelId: panelIdByLabel.get(label) || null,
          });
        }
        // Entries the DOM actually produced, before the registry merge: a scan
        // with none of them is a transient unrender, not an empty sidebar.
        const domCount = list.length;
        // Panels the DOM does not render (unpinned into the native More menu,
        // collapsed rail without rows, closed drawer) still belong in the
        // island. Append them right after the panel block so the familiar
        // order of every other entry stays untouched.
        if (panelRegistry.length) {
          const present = new Set();
          for (const e of list) if (e.panelId) present.add(e.panelId);
          const extra = [];
          for (const p of panelRegistry) {
            if (present.has(p.panelId) || seen.has(p.label)) continue;
            seen.add(p.label);
            extra.push({
              id: p.label,
              label: p.label,
              svg: iconCache.get(p.label) || null,
              panelId: p.panelId,
              registryOnly: true,
            });
          }
          if (extra.length) {
            let at = -1;
            for (let i = 0; i < list.length; i++) if (list[i].panelId) at = i;
            list.splice(at + 1, 0, ...extra);
          }
        }
        publishEntries(list, domCount);
      } catch (err) { console.warn(PKG, 'scan sidebar failed', err); }
    }

    function scheduleScan() {
      if (scanFrame) return;
      const raf = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (fn) => setTimeout(fn, 16);
      scanFrame = raf(() => { scanFrame = 0; scanSidebar(); });
    }

    // Observe the sidebar itself. Observing document.body meant every streamed
    // token in the conversation re-ran the whole scan (seven querySelectorAll
    // calls plus one SVG serialisation per button) and re-rendered the island.
    function ensureObserver() {
      if (typeof MutationObserver === 'undefined') return;
      const root = document.querySelector('[data-slot="sidebar"]') || document.body;
      if (!root) return;
      if (observedRoot === root && scannerObserver) return;
      if (scannerObserver) scannerObserver.disconnect();
      observedRoot = root;
      scannerObserver = new MutationObserver(scheduleScan);
      scannerObserver.observe(root, { childList: true, subtree: true });
      scheduleScan();
    }

    // One permanent scanner for the whole plugin lifetime (independent of
    // whether the island is enabled), so the settings page always has entries.
    function startScanner(ctx) {
      slotsService = ctx?.slots || null;
      scanSidebar();
      ensureObserver();
      // Watchdog: a remount replaces the sidebar element and an observer bound
      // to the old node stops firing. One querySelector per 1.5s is free.
      const watchdog = setInterval(ensureObserver, 1500);
      const t1 = setTimeout(scanSidebar, 600);
      const t2 = setTimeout(scanSidebar, 1600);
      return () => {
        clearInterval(watchdog);
        clearTimeout(t1);
        clearTimeout(t2);
        if (scanFrame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(scanFrame);
        scanFrame = 0;
        if (scannerObserver) { scannerObserver.disconnect(); scannerObserver = null; }
        observedRoot = null;
      };
    }

    // ---------- hide/show native buttons for migrated entries ----------
    const STYLE_CONTAINERS = [
      '[data-slot="sidebar"] [class*="_panelList"]',
      '[data-slot="sidebar"] [class*="_footerActions"]',
      '[data-slot="sidebar"] [class*="_settingsArea"]',
      '[data-slot="sidebar"] [class*="_footArea"]',
    ];
    function applyNativeVisibility(prefs, entries) {
      try {
        // One pass to build the lookup: the previous version called
        // entries.find() inside the button loop (O(n²) on every mutation).
        const byId = new Map();
        for (const e of entries) byId.set(e.id, e);
        for (const [id, btn] of buttonsRef) {
          if (!btn.isConnected) continue;
          const entry = byId.get(id) || { id, label: id };
          const migrate = isMigrated(entry, prefs);
          const hide = prefs.enabled && prefs.hideMigrated && migrate;
          btn.style.setProperty('display', hide ? 'none' : '', 'important');
          const row = btn.closest('[class*="_panelEntry"], [class*="_panelRow"]');
          if (row) row.style.setProperty('display', hide ? 'none' : '', 'important');
        }
        // Collapse any container whose buttons are ALL hidden, so no dead
        // gap remains between new-session / workspace / account rows.
        // Only collapse the panel-list container (global panels). NEVER hide
        // footerActions / settingsArea / footArea wholesale: they hold
        // non-migrated entries (account, cost-meter card) that must stay visible.
        let panelsCollapsed = false;
        const panelBoxes = document.querySelectorAll(
          '[data-slot="sidebar"] [class*="_panelList"], [data-slot="sidebar"] nav[aria-label]'
        );
        for (const box of panelBoxes) {
          // Ignore unpin "从侧边栏取消固定X" buttons — they are hover-only
          // controls attached to panel rows, not real entries. They stay
          // visible even after their panel button is hidden, which otherwise
          // made the container look non-empty and kept the 10px gap.
          const btns = [...box.querySelectorAll('button')].filter((b) =>
            !/取消固定|unpin/i.test((b.getAttribute('aria-label') || '') + (b.textContent || ''))
          );
          const anyVisible = btns.some((b) => getComputedStyle(b).display !== 'none');
          if (!anyVisible) {
            box.style.setProperty('display', 'none', 'important');
            box.style.setProperty('margin', '0', 'important');
            panelsCollapsed = true;
          } else {
            box.style.removeProperty('display');
            box.style.removeProperty('margin');
          }
        }
        document.body.classList.toggle('fi-panels-collapsed', panelsCollapsed);
        // Compact mode: hideMigrated on -> squeeze leftover native paddings.
        document.body.classList.toggle(
          'fi-native-compact',
          !!(prefs.enabled && prefs.hideMigrated)
        );
      } catch (err) { console.warn(PKG, 'visibility failed', err); }
    }
    // Coalesce visibility passes to one per frame. The sidebar observer fires
    // many times during a host render and every pass reads computed styles.
    let visibilityFrame = 0;
    function scheduleVisibility(getPrefs, getEntries) {
      if (visibilityFrame) return;
      const raf = typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame
        : (fn) => setTimeout(fn, 16);
      visibilityFrame = raf(() => {
        visibilityFrame = 0;
        applyNativeVisibility(getPrefs(), getEntries());
      });
    }

    function restoreNativeButtons() {
      try {
        for (const btn of buttonsRef.values()) {
          if (!btn.isConnected) continue;
          btn.style.removeProperty('display');
          btn.style.removeProperty('opacity');
          btn.style.removeProperty('pointer-events');
          const row = btn.closest('[class*="_panelEntry"], [class*="_panelRow"]');
          if (row) {
            row.style.removeProperty('display');
            row.style.removeProperty('opacity');
            row.style.removeProperty('pointer-events');
          }
        }
        for (const sel of STYLE_CONTAINERS) {
          for (const box of document.querySelectorAll(sel)) box.style.removeProperty('display');
        }
        document.body.classList.remove('fi-panels-collapsed');
        document.body.classList.remove('fi-native-compact');
      } catch (e) {}
    }

    // ---------- Island ----------
    // `runtime` carries the host services the island needs at click time. The
    // previous version took the layout service as an argument and dropped it,
    // so panel activation had no public-API path at all.
    function makeIsland(runtime) {
      // Resolved at click time, not at apply time: the layout service may not
      // be mounted yet when a phase-one client module applies.
      const getLayout = () => {
        try { return runtime && runtime.getLayout ? runtime.getLayout() : null; }
        catch (e) { return null; }
      };
      return function Island() {
        const [prefs, setPrefs] = usePrefs();
        const entries = useEntries();
        const wallpaper = useWallpaperActive();
        const [activeId, setActiveId] = useState(null);
        const rootRef = useRef(null);
        const tipRef = useRef(null);
        // True from pointerdown until shortly after release. While the island
        // chases a fast cursor it keeps sliding back under the pointer, which
        // re-fires pointerenter and re-showed the grip tooltip over and over.
        const tipSuppressed = useRef(false);

        // Portal tooltip: lives on <body>, NOT inside the island. The island
        // has overflow:auto + its own stacking context, which clipped an
        // in-tree tooltip. A fixed-position body child escapes both.
        useEffect(() => {
          const tip = document.createElement('div');
          tip.className = 'fi-portal-tip';
          tip.setAttribute('role', 'tooltip');
          document.body.appendChild(tip);
          tipRef.current = tip;
          return () => { tip.remove(); tipRef.current = null; };
        }, []);
        const showTip = (docked) => {
          if (tipSuppressed.current) return;
          const tip = tipRef.current;
          const grip = rootRef.current?.querySelector('.fi-grip');
          if (!tip || !grip) return;
          // Already visible: skip the getBoundingClientRect() (forced layout)
          // and the innerHTML write — a hover storm must stay cheap.
          if (tip.classList.contains('fi-show')) return;
          tip.innerHTML = '<b>' + (docked ? tr('gripDocked') : tr('gripFloat')) + '</b><small>' +
            (docked ? tr('gripDockedHint') : tr('gripFloatHint')) + '</small>';
          const r = grip.getBoundingClientRect();
          // Prefer the right side; flip to the left if it would overflow.
          const tw = 170;
          const left = (r.right + 12 + tw < window.innerWidth) ? r.right + 12 : r.left - tw - 12;
          tip.style.left = Math.max(4, left) + 'px';
          tip.style.top = (r.top + r.height / 2) + 'px';
          tip.classList.add('fi-show');
        };
        const hideTip = () => { tipRef.current?.classList.remove('fi-show'); };

        // Entries come from the module-level scanner (startScanner in apply).

        // Apply native visibility whenever prefs/entries change, and re-apply
        // if the shell rebuilds sidebar DOM later.
        const prefsRef = useRef(prefs);
        prefsRef.current = prefs;
        const entriesRef = useRef(entries);
        entriesRef.current = entries;
        useEffect(() => {
          const apply = () => applyNativeVisibility(prefsRef.current, entriesRef.current);
          apply();
          const t = setTimeout(apply, 700);
          // Mutations are coalesced to one pass per frame; the host re-renders
          // the sidebar many times while a reply streams.
          const mo = new MutationObserver(() =>
            scheduleVisibility(() => prefsRef.current, () => entriesRef.current));
          const sb = document.querySelector('[data-slot="sidebar"]');
          if (sb) mo.observe(sb, { childList: true, subtree: true });
          return () => { clearTimeout(t); mo.disconnect(); };
        }, [prefs.enabled, prefs.hideMigrated, Array.isArray(prefs.migrated) ? prefs.migrated.join('|') : 'default', entries.length]);

        // Reflect dock mode onto <body> so CSS can shift the native sidebar.
        useEffect(() => {
          if (!document.body) return;
          const docked = prefs.enabled && prefs.dockMode === 'docked';
          if (docked) document.body.setAttribute('data-fi-docked', '1');
          else document.body.removeAttribute('data-fi-docked');
          document.body.classList.toggle('fi-dock-sm', docked && prefs.size === 'sm');
          document.body.classList.toggle('fi-dock-lg', docked && prefs.size === 'lg');
          // Measure the real top of the app frame (titlebar height). The host's
          // --dsh-* vars are empty when data-windows-titlebar is absent, so a
          // CSS var fallback alone left the dock at top:0 and hid the grip.
          const measureTop = () => {
            const frame = document.querySelector('[data-slot="root"] > div[class*="_frame"]') ||
              document.querySelector('[class*="_frame"]');
            const topPx = frame ? Math.round(frame.getBoundingClientRect().top) : 36;
            document.documentElement.style.setProperty('--fi-dock-top', (topPx > 0 ? topPx : 36) + 'px');
          };
          measureTop();
          const t = setTimeout(measureTop, 800);
          // Window resize / zoom / fullscreen moves the frame's top edge; the
          // dock used to keep the value measured at mount and slid under the
          // titlebar.
          window.addEventListener('resize', measureTop);
          return () => {
            clearTimeout(t);
            window.removeEventListener('resize', measureTop);
            document.body.removeAttribute('data-fi-docked');
            document.body.classList.remove('fi-dock-sm');
            document.body.classList.remove('fi-dock-lg');
          };
        }, [prefs.enabled, prefs.dockMode, prefs.size]);

        // A stored position from a larger window (or a display change) must not
        // strand the island outside the viewport with no way back.
        const clampStoredPos = useCallback(() => {
          const root = rootRef.current;
          const cur = prefsRef.current;
          const pos = cur && cur.pos;
          if (!root || !pos || cur.dockMode === 'docked') return;
          const r = root.getBoundingClientRect();
          if (!r.width || !r.height) return;
          const x = Math.min(Math.max(8, pos.x), Math.max(8, window.innerWidth - r.width - 8));
          const y = Math.min(Math.max(8, pos.y), Math.max(8, window.innerHeight - r.height - 8));
          if (x !== pos.x || y !== pos.y) setPrefs({ pos: { x, y } });
        }, []);
        useEffect(() => {
          clampStoredPos();
          const t = setTimeout(clampStoredPos, 400);
          window.addEventListener('resize', clampStoredPos);
          return () => { clearTimeout(t); window.removeEventListener('resize', clampStoredPos); };
        }, [prefs.dockMode, prefs.pos && prefs.pos.x, prefs.pos && prefs.pos.y]);

        // Restore on unmount.
        useEffect(() => () => restoreNativeButtons(), []);

        // Track active panel (read-only DOM marker).
        useEffect(() => {
          const read = () => {
            const el = document.querySelector('nav[aria-label] [aria-current="page"], nav[aria-label] [class*="Active"]');
            const label = el?.getAttribute('aria-label');
            if (label) setActiveId(label);
          };
          const mo = new MutationObserver(read);
          if (document.body) mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class', 'aria-current'] });
          read();
          return () => mo.disconnect();
        }, []);

        const clickNative = useCallback((target) => {
          const id = typeof target === 'string' ? target : (target && target.id) || '';
          const btn = buttonsRef.get(id);
          if (btn && btn.isConnected) {
            // Defer the native click to the NEXT macrotask. On the conversation
            // page a document-level click handler (e.g. a modal backdrop or the
            // composer) sees the current click bubbling and immediately closes
            // a popup opened synchronously — which is why the popup appeared on
            // other panels but not on the conversation. Deferring avoids that
            // same-event-loop close. Also stop the island tile's own event here.
            setTimeout(() => btn.click(), 0);
            return;
          }
          // The row is not in the DOM (unpinned into the native More menu,
          // collapsed rail, closed drawer): the panel itself is still
          // addressable through the layout service. Deferred for the same
          // reason as the native click above.
          const panelId = (target && typeof target === 'object') ? target.panelId : null;
          const layoutSvc = panelId ? getLayout() : null;
          if (panelId && layoutSvc && typeof layoutSvc.selectPanel === 'function') {
            setTimeout(() => {
              try { layoutSvc.selectPanel(panelId); }
              catch (err) { console.warn(PKG, 'selectPanel failed', panelId, err); }
            }, 0);
            return;
          }
          if (id === '__settings') {
            const existing = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button')]
              .find((b) => SETTINGS_ITEM.test((b.textContent || '').trim()));
            if (existing) { existing.click(); return; }
            const acct = [...document.querySelectorAll('[data-slot="sidebar"] button, [data-slot="settings.launcher"] button')]
              .find((b) => ACCOUNT_LABEL.test((b.getAttribute('aria-label') || '') + (b.textContent || '')));
            if (acct) acct.click();
            const pick = () => {
              const item = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button, button')]
                .find((b) => SETTINGS_ITEM.test((b.textContent || '').trim()) && !b.closest('[data-float-islands]') && !SELF_LABEL.test(b.textContent || ''));
              if (item) item.click();
            };
            setTimeout(pick, 140); setTimeout(pick, 320);
            return;
          }
          const fallback = [...document.querySelectorAll('[data-slot="sidebar"] button')]
            .find((b) => (b.getAttribute('aria-label') || b.textContent?.trim()) === id);
          fallback?.click();
        }, []);

        // Grip = absorb button.
        //   click  -> toggle dock (float <-> docked)
        //   drag   -> undock if docked, then free-move with the pointer
        //
        // "Doesn't follow the cursor when moved fast" had three separate causes,
        // all fixed here:
        //  1. No pointer capture. The grip slid out from under the cursor, so
        //     moves were delivered to whatever sat below and the island lost
        //     the pointer mid-swing. setPointerCapture() retargets every move
        //     to the grip for the whole gesture.
        //  2. A requestAnimationFrame hop between the event and the style write
        //     added up to a full frame of latency — invisible when dragging
        //     slowly, obvious when flinging. The transform is now written
        //     straight from the pointer event.
        //  3. React's style diffing could wipe the inline transform whenever a
        //     re-render happened mid-drag (island snapped back, then jumped to
        //     the cursor on the next move). Position now rides on --fi-dx /
        //     --fi-dy custom properties, which React never manages.
        // The frosted glass is deliberately untouched.
        const dragState = useRef(null);
        const onGripDown = (ev) => {
          const root = rootRef.current;
          if (!root) return;
          if (dragState.current) return; // ignore a second pointer
          tipSuppressed.current = true;
          hideTip();
          if (ev.cancelable) ev.preventDefault();
          ev.stopPropagation?.();

          // 1. Capture: keep receiving moves even when the cursor outruns the
          // island or crosses an iframe/other element.
          const gripEl = ev.currentTarget;
          const pointerId = ev.pointerId;
          try { gripEl.setPointerCapture?.(pointerId); } catch (e) {}

          const pt = (e) => ({ x: e.clientX ?? e.pageX ?? 0, y: e.clientY ?? e.pageY ?? 0 });
          const p0 = pt(ev);
          const rect = root.getBoundingClientRect();
          const wasDocked = prefs.dockMode === 'docked';
          // Grab offset relative to the visible top-left. When docked the bar
          // is a full-height strip; grab at its center for a natural feel.
          const grabDx = wasDocked ? rect.width / 2 : p0.x - rect.left;
          const grabDy = wasDocked ? 26 : p0.y - rect.top;
          const st = { startX: p0.x, startY: p0.y, moved: false, lx: NaN, ly: NaN };
          dragState.current = st;

          // Anchor base = visual top-left. Written to left/top ONCE per drag.
          // The transform is pinned to the same var-driven expression the drag
          // uses, because the float island is normally centred with CSS
          // translateY(-50%): replacing that transform without also pinning top
          // would make it jump by half its height at pointerdown.
          let baseX = rect.left;
          let baseY = rect.top;
          // Visual size, used to keep the island inside the viewport while it
          // travels. Re-measured when a docked strip becomes a float.
          let rw = rect.width;
          let rh = rect.height;
          const anchor = (x, y) => {
            root.style.setProperty('left', `${x}px`, 'important');
            root.style.setProperty('top', `${y}px`, 'important');
            root.style.setProperty('right', 'auto', 'important');
            root.style.setProperty(
              'transform', 'translate3d(var(--fi-dx, 0px), var(--fi-dy, 0px), 0)', 'important');
          };
          if (!wasDocked) anchor(baseX, baseY);

          const beginFloat = () => {
            root.classList.remove('fi-docked');
            root.style.removeProperty('height');
            root.style.removeProperty('width');
            root.style.removeProperty('max-height');
            document.body.removeAttribute('data-fi-docked');
            if (wasDocked) {
              // Docked strip -> float: keep the grab point under the cursor.
              baseX = p0.x - grabDx;
              baseY = p0.y - grabDy;
              anchor(baseX, baseY);
            }
            const floatRect = root.getBoundingClientRect();
            if (floatRect.width) rw = floatRect.width;
            if (floatRect.height) rh = floatRect.height;
            root.classList.add('fi-dragging');
            document.body.classList.add('fi-dragging-body');
          };

          // Keep a slice of the island reachable: a fast flick used to be able
          // to park it fully outside the viewport with no way back.
          const clampTo = (x, y) => ({
            x: Math.min(Math.max(8, x), Math.max(8, window.innerWidth - rw - 8)),
            y: Math.min(Math.max(8, y), Math.max(8, window.innerHeight - rh - 8)),
          });
          // 2 + 3. Write straight from the event into custom properties.
          const paint = (dx, dy) => {
            const p = clampTo(baseX + dx, baseY + dy);
            const cdx = p.x - baseX;
            const cdy = p.y - baseY;
            if (cdx === st.lx && cdy === st.ly) return; // nothing new to show
            st.lx = cdx; st.ly = cdy;
            root.style.setProperty('--fi-dx', `${cdx}px`);
            root.style.setProperty('--fi-dy', `${cdy}px`);
          };
          const move = (e) => {
            if (!dragState.current) return;
            const q = pt(e);
            const dx = q.x - st.startX;
            const dy = q.y - st.startY;
            if (!st.moved) {
              if (Math.abs(dx) + Math.abs(dy) < 5) return;
              st.moved = true;
              beginFloat();
            }
            paint(dx, dy);
          };

          const endDrag = (cancelled) => {
            if (!dragState.current) return;
            dragState.current = null;
            for (const t of ['pointermove', 'mousemove']) document.removeEventListener(t, move);
            for (const t of ['pointerup', 'mouseup', 'pointercancel', 'lostpointercapture']) {
              for (const fn of [onEnd, onCancel]) {
                document.removeEventListener(t, fn);
                gripEl.removeEventListener(t, fn);
              }
            }
            try {
              if (gripEl.hasPointerCapture?.(pointerId)) gripEl.releasePointerCapture(pointerId);
            } catch (e) {}
            document.body.classList.remove('fi-dragging-body');
            // Keep tooltips quiet for a beat: releasing usually leaves the
            // cursor right on the grip, and an instant pop reads as a glitch.
            setTimeout(() => { tipSuppressed.current = false; }, 220);

            if (!cancelled && st.moved) {
              // Commit the final position once, then hand ownership to React.
              const finalX = baseX + (st.lx || 0);
              const finalY = baseY + (st.ly || 0);
              root.style.setProperty('left', `${finalX}px`);
              root.style.setProperty('top', `${finalY}px`);
              root.style.setProperty('--fi-dx', '0px');
              root.style.setProperty('--fi-dy', '0px');
              root.classList.remove('fi-dragging');
              root.style.setProperty('transform', 'none', 'important');
              setPrefs({ dockMode: 'float', pos: { x: finalX, y: finalY }, position: 'left' });
            } else {
              // Plain click toggles dock. Drop our inline styles so React can
              // paint the correct dock/float geometry from prefs.
              root.classList.remove('fi-dragging');
              for (const p of ['left', 'top', 'right', 'transform', 'height', 'width', 'max-height',
                '--fi-dx', '--fi-dy'])
                root.style.removeProperty(p);
              if (wasDocked) document.body.removeAttribute('data-fi-docked');
              if (!cancelled) setPrefs({ dockMode: wasDocked ? 'float' : 'docked' });
            }
          };
          // Event handlers pass an event object, so wrap them: a bare endDrag
          // would treat the event as the `cancelled` flag.
          const onEnd = () => endDrag(false);
          const onCancel = () => endDrag(true);
          // Listen on the grip (captured target) AND document, so the gesture
          // still ends correctly if capture is unavailable.
          for (const t of ['pointermove', 'mousemove']) document.addEventListener(t, move);
          for (const t of ['pointerup', 'mouseup']) {
            document.addEventListener(t, onEnd);
            gripEl.addEventListener(t, onEnd);
          }
          for (const t of ['pointercancel', 'lostpointercapture']) {
            document.addEventListener(t, onCancel);
            gripEl.addEventListener(t, onCancel);
          }
        };

        // Resize: drag the right-edge handle to change column count.
        // Horizontal movement of roughly one tile width = one column step.
        const resizeState = useRef(null);
        const onResizeDown = (ev) => {
          const root = rootRef.current;
          if (!root || prefs.dockMode === 'docked') return;
          if (ev.cancelable) ev.preventDefault();
          ev.stopPropagation?.();
          const handle = ev.currentTarget;
          handle.classList.add('fi-resizing');
          // NOT fi-dragging: that class applies the drag transform, which would
          // cancel the float centering. Resize only needs the transition off.
          root.classList.add('fi-resize-gesture');
          tipSuppressed.current = true;
          hideTip();
          try { handle.setPointerCapture?.(ev.pointerId); } catch (e) {}
          const pt = (e) => e.clientX ?? e.pageX ?? 0;
          const startX = pt(ev);
          const startCols = prefs.cols || 1;
          const tileW = (root.querySelector('.fi-tile')?.getBoundingClientRect().width || 44) + 8;
          const maxCols = Math.max(1, entries.length);
          let nextCols = startCols;
          const hint = document.createElement('div');
          hint.className = 'fi-resize-hint';
          document.body.appendChild(hint);
          // Cache the island rect once. Calling getBoundingClientRect() on
          // every pointermove forces a synchronous layout while --fi-cols is
          // changing, which is the main source of the one-step-per-frame lag.
          const rect = root.getBoundingClientRect();
          hint.style.left = rect.right + 'px';
          hint.style.top = rect.top + 'px';
          hint.textContent = nextCols >= maxCols ? tr('colsRow', { n: nextCols }) : tr('cols', { n: nextCols });
          hint.classList.add('fi-show');
          // Coalesce column writes to one per frame; only update the hint
          // text when the value actually changes.
          let raf = 0;
          let lastX = startX;
          let shownCols = nextCols;
          const flush = () => {
            raf = 0;
            const delta = Math.round((lastX - startX) / tileW);
            const cols = Math.min(maxCols, Math.max(1, startCols + delta));
            if (cols === shownCols) return;
            shownCols = cols;
            nextCols = cols;
            root.style.setProperty('--fi-cols', String(cols));
            hint.textContent = cols >= maxCols ? tr('colsRow', { n: cols }) : tr('cols', { n: cols });
          };
          // Same reasoning as the grip drag: apply straight from the event so
          // the handle tracks the cursor without an extra frame of latency.
          const move = (e) => {
            lastX = pt(e);
            flush();
          };
          const up = () => {
            if (raf) { cancelAnimationFrame(raf); raf = 0; }
            flush();
            for (const t of ['pointermove', 'mousemove']) document.removeEventListener(t, move);
            for (const t of ['pointerup', 'mouseup', 'pointercancel']) document.removeEventListener(t, up);
            root.classList.remove('fi-resize-gesture');
            handle.classList.remove('fi-resizing');
            hint.remove();
            setTimeout(() => { tipSuppressed.current = false; }, 220);
            if (nextCols !== startCols) setPrefs({ cols: nextCols });
          };
          for (const t of ['pointermove', 'mousemove']) document.addEventListener(t, move);
          for (const t of ['pointerup', 'mouseup', 'pointercancel']) document.addEventListener(t, up);
        };

        if (!prefs.enabled) return null;

        const migrated = entries.filter((e) => isMigrated(e, prefs) && !prefs.hidden.includes(e.id));
        const iconNode = (entry) => entry?.svg
          ? h('span', { className: 'fi-svg', dangerouslySetInnerHTML: { __html: entry.svg } })
          : initialCaps(entry?.id);
        const tile = (entry) => {
          const label = labelOf(entry);
          return h('button', {
            type: 'button', key: entry.id, className: 'fi-tile', 'aria-label': label,
            onClick: (ev) => { ev.stopPropagation?.(); clickNative(entry); },
          }, iconNode(entry),
            prefs.showLabels ? h('span', { className: 'fi-label' }, label) : null,
            h('span', { className: 'fi-tip' }, label));
        };

        const docked = prefs.dockMode === 'docked';
        const posStyle = docked ? {}
          : (prefs.pos ? { left: `${prefs.pos.x}px`, top: `${prefs.pos.y}px`, transform: 'none' }
            : (prefs.position === 'left' ? { left: `${prefs.offset}px` } : { right: `${prefs.offset}px` }));

        return h('div', {
          ref: rootRef,
          className: `fi-root fi-${prefs.size}` + (docked ? ' fi-docked' : '') +
            (prefs.position === 'right' && !docked ? ' fi-right' : '') +
            (prefs.glass && !wallpaper ? '' : ' fi-solid'),
          style: { ...posStyle, '--fi-cols': String(Math.min(Math.max(1, prefs.cols || 1), Math.max(1, migrated.length))) },
          'data-float-islands': 'root',
        },
          h('div', {
            className: 'fi-grip', key: 'grip',
            onPointerDown: onGripDown,
            onPointerEnter: () => showTip(docked),
            onPointerLeave: hideTip,
            style: { touchAction: 'none' },
          }, '⠿'),
          ...migrated.map((e) => tile(e)),
          migrated.length === 0 ? h('div', { className: 'fi-empty', key: 'empty' }, tr('empty')) : null,
          !docked && h('div', {
            className: 'fi-resize', key: 'resize',
            title: tr('resizeTitle'),
            onPointerDown: onResizeDown,
            style: { touchAction: 'none' },
          })
        );
      };
    }

    // ---------- settings page ----------
    function SettingsSection() {
      const [prefs, setPrefs] = usePrefs();
      const entries = useEntries();
      // Ordinary settings apply IMMEDIATELY. Only the entry-migration selection
      // is staged and needs 保存; 取消 drops it, 还原默认 resets it.
      const defaultMigrated = defaultMigratedIds(entries);
      const currentMigrated = Array.isArray(prefs.migrated) ? prefs.migrated : defaultMigrated;
      const [draftMigrated, setDraftMigrated] = useState(currentMigrated);
      const [dirty, setDirty] = useState(false);
      useEffect(() => { if (!dirty) setDraftMigrated(currentMigrated); }, [prefs.migrated, entries.length, dirty]);

      const edit = (key, v) => setPrefs({ [key]: v }); // immediate for all normal settings
      const toggleMigrated = (id) => {
        setDraftMigrated((d) => d.includes(id) ? d.filter((x) => x !== id) : [...d, id]);
        setDirty(true);
      };
      const save = () => {
        const same = defaultMigrated.length === draftMigrated.length &&
          defaultMigrated.every((x) => draftMigrated.includes(x));
        setPrefs({ migrated: same ? null : [...draftMigrated] });
        setDirty(false);
      };
      const cancel = () => { setDraftMigrated(currentMigrated); setDirty(false); };
      const reset = () => { setDraftMigrated(defaultMigrated); setDirty(true); };

      const row = (title, hint, control) => h('div', { className: 'fi-row' },
        h('div', null, h('div', { className: 'fi-row-title' }, title), hint ? h('div', { className: 'fi-hint' }, hint) : null),
        control);
      const sw = (key, label, hint) => row(label, hint,
        h('input', { type: 'checkbox', className: 'fi-switch', checked: !!prefs[key], onChange: (e) => edit(key, e.target.checked), 'aria-label': label }));

      return h('div', { className: 'fi-settings' },
        // One-time first-run row: a fresh install never hides the host's own
        // navigation behind the user's back. Dismissing keeps both visible.
        !prefs.onboarded && row(tr('onboardTitle'), tr('onboardHint'),
          h('div', { style: { display: 'flex', gap: '6px', flex: 'none' } },
            h('button', {
              className: 'fi-mini', type: 'button',
              onClick: () => setPrefs({ hideMigrated: true, onboarded: true }),
            }, tr('onboardAction')),
            h('button', {
              className: 'fi-mini', type: 'button',
              onClick: () => setPrefs({ onboarded: true }),
            }, tr('onboardLater')))),
        // Entry migration — staged; must click 保存 to apply.
        row(tr('migrationTitle'), tr('migrationHint'), null),
        h('div', { className: 'fi-entry-toolbar' },
          h('button', { className: 'fi-mini', type: 'button', onClick: () => { setDraftMigrated(entries.map((e) => e.id)); setDirty(true); } }, tr('selectAll')),
          h('button', { className: 'fi-mini', type: 'button', onClick: () => { setDraftMigrated([]); setDirty(true); } }, tr('selectNone')),
          h('button', { className: 'fi-mini', type: 'button', onClick: reset }, tr('restoreDefault'))
        ),
        h('div', { className: 'fi-entry-list' },
          ...entries.map((e) => {
            const on = draftMigrated.includes(e.id);
            const icon = e.svg
              ? h('span', { className: 'fi-svg', dangerouslySetInnerHTML: { __html: e.svg } })
              : h('span', { className: 'fi-entry-fallback' }, initialCaps(e.id));
            return h('label', { key: e.id, className: 'fi-entry-row' + (on ? ' fi-on' : '') },
              h('span', { className: 'fi-entry-name' }, icon, h('span', null, labelOf(e))),
              h('input', { type: 'checkbox', className: 'fi-switch', checked: on, onChange: () => toggleMigrated(e.id), 'aria-label': tr('migrateAria', { name: labelOf(e) }) })
            );
          })
        ),

        // All settings below take effect instantly — no save needed.
        sw('enabled', tr('enable'), tr('enableHint')),
        row(tr('dock'), tr('dockHint'),
          h('input', { type: 'checkbox', className: 'fi-switch', checked: prefs.dockMode === 'docked', onChange: (e) => edit('dockMode', e.target.checked ? 'docked' : 'float'), 'aria-label': tr('dock') })),
        sw('hideMigrated', tr('hideMigrated'), tr('hideMigratedHint')),
        sw('glass', tr('glass'), tr('glassHint')),
        sw('showLabels', tr('showLabels'), tr('showLabelsHint')),
        prefs.dockMode !== 'docked' && row(tr('position'), null,
          h('select', { className: 'fi-select', value: prefs.position, onChange: (e) => edit('position', e.target.value), 'aria-label': tr('position') },
            h('option', { value: 'left' }, tr('left')), h('option', { value: 'right' }, tr('right')))),
        prefs.dockMode !== 'docked' && row(tr('offset'), null,
          h('input', { className: 'fi-input', type: 'number', min: 0, max: 800, value: prefs.offset, onChange: (e) => edit('offset', Number(e.target.value) || 0), 'aria-label': tr('offset') })),
        prefs.dockMode !== 'docked' && row(tr('posTitle'), tr('posHint'), 
          h('button', { className: 'fi-mini', type: 'button', onClick: () => edit('pos', null), disabled: !prefs.pos }, tr('resetPos'))),
        row(tr('size'), null,
          h('select', { className: 'fi-select', value: prefs.size, onChange: (e) => edit('size', e.target.value), 'aria-label': tr('size') },
            h('option', { value: 'sm' }, tr('small')), h('option', { value: 'md' }, tr('medium')), h('option', { value: 'lg' }, tr('large')))),
        row(tr('colsTitle'), tr('colsHint'),
          h('select', { className: 'fi-select', value: prefs.cols, onChange: (e) => edit('cols', Number(e.target.value)), 'aria-label': tr('colsTitle') },
            ...entries.map((_, i) => h('option', { key: i + 1, value: i + 1 }, i === entries.length - 1 ? tr('colsRowLast', { n: i + 1 }) : tr('cols', { n: i + 1 }))))),

        h('div', { className: 'fi-actions' },
          h('button', { className: 'fi-btn', type: 'button', onClick: reset }, tr('restoreDefault')),
          h('button', { className: 'fi-btn', type: 'button', onClick: cancel, disabled: !dirty }, tr('cancel')),
          h('button', { className: 'fi-btn fi-btn-primary', type: 'button', onClick: save, disabled: !dirty }, tr('saveMigration'))
        )
      );
    }

    return {
      inject: ['slots', 'layout', 'locale'],
      apply(ctx) {
        try {
          const slotsSvc = ctx.slots;
          if (!slotsSvc) return;
          // Register the runtime copy so the host resolves the active language.
          // Without a locale service the built-in Chinese dictionary stays in
          // place, so the plugin keeps working on an older host.
          if (ctx.locale) {
            if (typeof ctx.locale.register === 'function') {
              try { ctx.effect(() => ctx.locale.register(LOCALE_NS, TEXT)); }
              catch (err) { console.warn(PKG, 'locale registration failed', err); }
            }
            if (typeof ctx.locale.bind === 'function') {
              try { t = ctx.locale.bind(LOCALE_NS); }
              catch (err) { console.warn(PKG, 'locale bind failed', err); }
            }
          }
          const styleEl = document.createElement('style');
          styleEl.textContent = CSS;
          document.head.appendChild(styleEl);
          ctx.effect(() => () => { styleEl.remove(); restoreNativeButtons(); }, PKG + ': styles');
          const stopScanner = startScanner(ctx);
          ctx.effect(() => stopScanner, PKG + ': scanner');

          ctx.slots.inject('shell.overlay', () => ctx.slots.register({
            name: 'shell.overlay', id: 'float-islands', order: -80,
          }, makeIsland({ getLayout: () => ctx.layout })));

          ctx.slots.inject('settings.section', () => ctx.slots.register({
            name: 'settings.section', id: 'float-islands', order: 30,
            label: () => tr('title'),
          }, SettingsSection));
          ctx.slots.inject('settings.section.icon', () => ctx.slots.register({
            name: 'settings.section.icon', id: 'float-islands', order: 30,
            label: () => tr('title'),
          }, () => h('span', { style: { fontSize: 16 } }, '🏝')));
        } catch (err) {
          console.error(PKG, 'apply error', err);
        }
      },
    };
  },
});
