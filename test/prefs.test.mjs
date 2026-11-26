import test from 'node:test';
import assert from 'node:assert/strict';
import { createHost, mount, sidebarHtml, PREF_KEY } from './host.mjs';

test('a schema-15 profile keeps its layout and never sees the first-run row', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 15 } });
  t.after(() => app.teardown());
  assert.deepEqual(app.hidden().sort(), ['插件', '插件商店', '定时任务', '知识中心'].sort(),
    'users who had hiding on keep it after the migration');
  assert.doesNotMatch(app.settingsText(), /首次使用/);
  // The upgrade is applied in memory; the stored copy is normalised on the
  // first write, so an older build can still read the file it left behind.
  assert.equal(app.prefs()._v, 15);
  app.settingsHost.querySelector('input[aria-label="显示入口名称"]').click();
  await app.settle(80);
  assert.equal(app.prefs()._v, 16, 'the first write stores the upgraded schema');
});

test('a schema-15 profile that never stored hideMigrated defaults to hiding', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 15, hideMigrated: undefined } });
  t.after(() => app.teardown());
  assert.equal(app.hidden().length, 4);
});

test('an unknown schema falls back to defaults and warns once', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 7, enabled: false } });
  t.after(() => app.teardown());
  assert.equal(app.tiles().length, 4, 'defaults win, so the island renders again');
  assert.ok(app.warnings.some((w) => w.includes('unknown prefs schema')));
});

test('a downgraded profile keeps the fields it understands', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host, { prefs: { _v: 99, enabled: true, size: 'lg', cols: 2 } });
  t.after(() => app.teardown());
  const root = app.islandHost.querySelector('.fi-root');
  assert.ok(root.className.includes('fi-lg'));
});

test('a settings switch persists through localStorage', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  const toggle = app.settingsHost.querySelector('input[aria-label="启用浮岛栏"]');
  assert.ok(toggle, 'the enable switch is rendered');
  toggle.click();
  await app.settle(80);
  assert.equal(app.prefs().enabled, false);
  assert.equal(host.w.localStorage.getItem(PREF_KEY) !== null, true);
});

test('the dictionary exposes both languages', async (t) => {
  const host = await createHost(sidebarHtml());
  const app = await mount(host);
  t.after(() => app.teardown());
  const dict = app.dictionary();
  assert.ok(dict && dict.zh && dict.en);
  assert.equal(dict.zh.enable, '启用浮岛栏');
  assert.equal(dict.en.enable, 'Enable Float Islands');
});
