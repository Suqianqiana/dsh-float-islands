import test from 'node:test';
import assert from 'node:assert/strict';
import { createHost, mount, sidebarHtml } from './host.mjs';

test('renders one tile per migrated entry, in sidebar order', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  assert.deepEqual(app.tiles(), ['插件', '插件商店', '定时任务', '知识中心']);
});

test('a tile click is forwarded to the real button, not selectPanel', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  let hits = 0;
  host.w.document
    .querySelector('[data-slot="sidebar"] button[aria-label="插件"]')
    .addEventListener('click', () => { hits += 1; });
  assert.equal(await app.click('插件'), true);
  assert.equal(hits, 1, 'native click must fire exactly once');
  assert.deepEqual(app.layoutCalls, [], 'the native path must win while the row exists');
});

test('hideMigrated hides migrated rows and compacts the sidebar', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 16, hideMigrated: true } });
  t.after(() => app.teardown());
  assert.deepEqual(app.hidden().sort(), ['插件', '插件商店', '定时任务', '知识中心'].sort());
  assert.ok(app.bodyClasses().includes('fi-native-compact'));
  assert.ok(app.bodyClasses().includes('fi-panels-collapsed'));
});

test('a fresh install leaves the native sidebar alone', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  assert.deepEqual(app.hidden(), [], 'nothing may be hidden on a fresh install');
  assert.ok(!app.bodyClasses().includes('fi-native-compact'));
  assert.match(app.settingsText(), /首次使用/);
});

test('disabling the island restores every native row', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 16, enabled: false, hideMigrated: true } });
  t.after(() => app.teardown());
  assert.deepEqual(app.tiles(), []);
  assert.deepEqual(app.hidden(), []);
});

test('the settings page lists every scanned entry', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  assert.equal(app.entries(), 6, 'new session + 3 panels + knowledge + account');
});
