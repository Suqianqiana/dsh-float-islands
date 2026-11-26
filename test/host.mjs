/**
 * Test host: a jsdom page shaped like the DSH shell, with the real client.js
 * loaded through the module loader contract. Everything the plugin sees here
 * comes from its own code paths — no stubs for the scanner, the prefs or the
 * island rendering.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
export const CLIENT = path.resolve(here, '..', 'client.js');
export const PREF_KEY = 'dsh-float-islands:prefs';

const SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="4" width="7" height="7" rx="2"/></svg>';

/** Sidebar markup mirroring the host: hashed class names, aria-labels, rows. */
export function sidebarHtml(options = {}) {
  const panels = options.panels || ['插件', '插件商店', '定时任务'];
  const foot = options.foot || '知识中心';
  const account = options.account || '账号菜单';
  const rows = panels.map((label) =>
    '        <div class="_panelEntry"><button aria-label="' + label + '">' + SVG + label + '</button></div>'
  ).join('\n');
  return [
    '<div data-slot="root"><div class="pI_x6G_frame">',
    '  <aside data-slot="sidebar">',
    '    <div class="_headerRow"><button data-sidebar-toggle aria-label="隐藏侧栏">H</button></div>',
    '    <div class="_newSessionRow"><button aria-label="新建会话">' + SVG + '新建会话</button></div>',
    '    <nav aria-label="主导航">',
    '      <div class="_panelList">',
    rows,
    '      </div>',
    '    </nav>',
    '    <div class="_scrollRegion"><div class="_regionArea"><button aria-label="工作区甲">WS</button></div></div>',
    '    <div class="_footArea"><button aria-label="' + foot + '">' + SVG + foot + '</button><div class="cm-footer-stack">今日 0</div></div>',
    '    <div class="_settingsArea"><button aria-label="' + account + '">ACC</button></div>',
    '  </aside>',
    '  <main data-slot="main"></main>',
    '</div></div>',
  ].join('\n');
}

export async function createHost(html) {
  const dom = new JSDOM('<!doctype html><html><head></head><body>' + html + '</body></html>', {
    url: 'http://localhost/', pretendToBeVisual: true, runScripts: 'outside-only',
  });
  const w = dom.window;
  global.window = w;
  global.document = w.document;
  Object.defineProperty(global, 'navigator', { value: w.navigator, configurable: true, writable: true });
  global.localStorage = w.localStorage;
  global.MutationObserver = w.MutationObserver;
  global.getComputedStyle = w.getComputedStyle.bind(w);
  global.requestAnimationFrame = w.requestAnimationFrame.bind(w);
  global.cancelAnimationFrame = w.cancelAnimationFrame.bind(w);
  global.HTMLElement = w.HTMLElement;
  global.Element = w.Element;
  global.Node = w.Node;
  global.Event = w.Event;
  const React = (await import('react')).default;
  const ReactDOMClient = await import('react-dom/client');
  return { dom, w, React, createRoot: ReactDOMClient.createRoot };
}

const tick = (ms = 60) => new Promise((resolve) => setTimeout(resolve, ms));

/** Load client.js, apply it against a fake host service set, and render both halves. */
export async function mount(host, options = {}) {
  const panels = options.panels || ['插件', '插件商店', '定时任务'];
  if (options.prefs) host.w.localStorage.setItem(PREF_KEY, JSON.stringify(options.prefs));
  const code = fs.readFileSync(CLIENT, 'utf8');
  let mod = null;
  host.w.__ModuleLoader__ = {
    load: ({ factory }) => { mod = factory((name) => { if (name === 'react') return host.React; throw new Error('unexpected require ' + name); }); },
  };
  host.w.eval(code);

  const registered = [];
  const layoutCalls = [];
  const disposers = [];
  const warnings = [];
  let dictionary = null;
  const originalWarn = host.w.console.warn;
  host.w.console.warn = (...args) => { warnings.push(args.join(' ')); };

  const ctx = {
    slots: {
      entriesOfSlot: (key) => (key === 'sidebar.panellist' ? panels.map((label, i) => ({ component: {}, options: { id: 'panel-' + i, label } })) : []),
      subscribe: () => () => {},
      register: (opts, component) => { registered.push({ opts, component }); return () => {}; },
      inject: (_name, cb) => { cb(); },
    },
    layout: options.noLayout ? undefined : { selectPanel: (id) => layoutCalls.push(id) },
    locale: {
      register: (_ns, dict) => { dictionary = dict; return () => {}; },
      bind: () => (key) => {
        const zh = (dictionary && dictionary.zh) || {};
        return typeof zh[key] === 'string' ? zh[key] : '';
      },
    },
    effect: (fn) => { const stop = fn(); if (typeof stop === 'function') disposers.push(stop); return () => {}; },
    get: () => undefined,
  };

  mod.apply(ctx);
  await tick(40);

  const overlay = registered.find((r) => r.opts.name === 'shell.overlay');
  const settings = registered.find((r) => r.opts.name === 'settings.section');
  const islandHost = host.w.document.createElement('div');
  host.w.document.body.appendChild(islandHost);
  const islandRoot = host.React ? host.createRoot(islandHost) : null;
  if (overlay) islandRoot.render(host.React.createElement(overlay.component));
  await tick(120);

  let settingsHost = null;
  let settingsRoot = null;
  if (settings) {
    settingsHost = host.w.document.createElement('div');
    host.w.document.body.appendChild(settingsHost);
    settingsRoot = host.createRoot(settingsHost);
    settingsRoot.render(host.React.createElement(settings.component));
    await tick(80);
  }

  const doc = host.w.document;
  return {
    dictionary: () => dictionary,
    warnings,
    layoutCalls,
    islandHost,
    settingsHost,
    tiles: () => [...islandHost.querySelectorAll('.fi-tile')].map((el) => el.getAttribute('aria-label')),
    tile: (label) => [...islandHost.querySelectorAll('.fi-tile')].find((el) => el.getAttribute('aria-label') === label) || null,
    entries: () => [...settingsHost.querySelectorAll('.fi-entry-row')].length,
    settingsText: () => (settingsHost ? settingsHost.textContent : ''),
    hidden: () => [...doc.querySelectorAll('[data-slot="sidebar"] button')]
      .filter((el) => el.style.display === 'none')
      .map((el) => el.getAttribute('aria-label')),
    bodyClasses: () => [...doc.body.classList],
    async click(label) {
      const el = this.tile(label);
      if (!el) return false;
      el.dispatchEvent(new host.w.MouseEvent('click', { bubbles: true, cancelable: true }));
      await tick(40);
      return true;
    },
    async settle(ms = 120) { await tick(ms); },
    prefs() { const raw = host.w.localStorage.getItem(PREF_KEY); return raw ? JSON.parse(raw) : null; },
    async teardown() {
      if (settingsRoot) settingsRoot.unmount();
      if (islandRoot) islandRoot.unmount();
      for (const stop of disposers) { try { stop(); } catch (e) {} }
      host.w.console.warn = originalWarn;
      host.dom.window.close();
    },
  };
}
