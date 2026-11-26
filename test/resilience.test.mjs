import test from 'node:test';
import assert from 'node:assert/strict';
import { createHost, mount, sidebarHtml } from './host.mjs';

test('a panel row that disappears keeps its tile and falls back to selectPanel', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 16, hideMigrated: true } });
  t.after(() => app.teardown());
  const row = host.w.document.querySelector('[data-slot="sidebar"] button[aria-label="定时任务"]');
  row.closest('._panelEntry').remove();
  await app.settle(160);
  assert.ok(app.tiles().includes('定时任务'), 'registry keeps the entry alive');
  assert.equal(await app.click('定时任务'), true);
  assert.deepEqual(app.layoutCalls, ['panel-2'], 'a missing row activates through the layout service');
});

test('an empty scan never wipes the island', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  assert.equal(app.tiles().length, 4);
  host.w.document.querySelectorAll('[data-slot="sidebar"] button').forEach((el) => el.remove());
  await app.settle(160);
  assert.equal(app.tiles().length, 4, 'a transient unrender must keep the last known entries');
});

test('session-row buttons inside the sidebar are not entries', async (t) => {
  const html = sidebarHtml().replace('<div class="_panelList">',
    '<div class="_panelList"></div><div data-row-key="s1"><button aria-label="会话一">S</button></div><div class="_panelList">');
  const host = await createHost(html);
  const app = await mount(host);
  t.after(() => app.teardown());
  assert.ok(!app.tiles().includes('会话一'));
});

test('a tile keeps its icon after its row is unpinned at runtime', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 16, hideMigrated: true } });
  t.after(() => app.teardown());
  assert.ok(app.tile('插件商店').innerHTML.includes('<svg'));
  host.w.document.querySelector('[data-slot="sidebar"] button[aria-label="插件商店"]').closest('._panelEntry').remove();
  await app.settle(160);
  assert.ok(app.tiles().includes('插件商店'));
  assert.ok(app.tile('插件商店').innerHTML.includes('<svg'), 'the cached icon must survive the unpin');
});

test('a host without a layout service does not throw on click', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { noLayout: true, prefs: { _v: 16 } });
  t.after(() => app.teardown());
  host.w.document.querySelector('[data-slot="sidebar"] button[aria-label="插件"]').closest('._panelEntry').remove();
  await app.settle(160);
  await app.click('插件');
  assert.deepEqual(app.warnings.filter((w) => w.includes('selectPanel')), [], 'a missing service must not warn');
  assert.ok(app.tiles().includes('插件'), 'the tile stays reachable');
});
