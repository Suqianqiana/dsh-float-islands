#!/usr/bin/env node
/**
 * Generate market/index.json — a plugin-market format-1 index pinned to a commit.
 *
 *   node scripts/make-index.mjs                 # pin the current HEAD
 *   node scripts/make-index.mjs --commit <sha>  # pin a specific release commit
 *   node scripts/make-index.mjs --workspace     # heading for your own index
 *
 * The market reads indexes a user adds by URL, so this file is what makes the
 * plugin installable: host it on GitHub (raw) or jsDelivr and share the URL.
 * Every version must name an exact 40-hex commit, which is why this runs after
 * the release commit exists.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const repoUrl = (pkg.repository && pkg.repository.url ? pkg.repository.url : '')
  .replace(/^git\+/, '')
  .replace(/\.git$/, '');
const commit = flag('--commit') || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim();

if (!/^[0-9a-f]{40}$/.test(commit)) {
  console.error('commit must be a lowercase 40-hex sha, got: ' + commit);
  process.exit(2);
}
if (!repoUrl.startsWith('https://')) {
  console.error('package.json repository.url must be an https URL');
  process.exit(2);
}

const engineRange = (pkg.engines && pkg.engines.dsh) || '>=0.2.2-rc.5';
const publishTimestamp = Math.floor(Date.now() / 1000);

const index = {
  format: 1,
  title: { en: 'Suqianqiana plugins', zh: 'Suqianqiana 的插件索引' },
  description: {
    en: 'Plugins published by Suqianqiana.',
    zh: 'Suqianqiana 发布的 DSH 插件。',
  },
  metadata: {
    categories: { sidebar: { title: { en: 'Sidebar', zh: '侧栏' } } },
    labels: {
      ui: { title: { en: 'Interface', zh: '界面' } },
      navigation: { title: { en: 'Navigation', zh: '导航' } },
    },
    sortKeys: {},
  },
  plugins: [
    {
      name: pkg.name,
      title: { en: 'Float Islands', zh: '浮岛栏' },
      description: {
        en: 'Collect every left-sidebar entry into one draggable glass island. Panels come from the sidebar registry, so the native UI and wallpaper engines keep working.',
        zh: '把左栏全部入口收进一个可拖拽的玻璃浮岛；面板走 sidebar.panellist 注册表，与原生界面和壁纸引擎共存。',
      },
      icon: './icon.svg',
      author: typeof pkg.author === 'string' ? pkg.author : 'Suqianqiana',
      homepage: pkg.homepage,
      repository: { url: repoUrl },
      metadata: { category: 'sidebar', labels: ['ui', 'navigation'], keywords: pkg.keywords || [] },
      versions: [
        {
          version: pkg.version,
          publishTimestamp,
          source: { type: 'git', url: repoUrl + '.git', commit },
          engines: { dsh: engineRange },
        },
      ],
    },
  ],
};

const outDir = path.join(root, 'market');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2) + String.fromCharCode(10));
fs.copyFileSync(path.join(root, 'icon.svg'), path.join(outDir, 'icon.svg'));

console.log('wrote market/index.json');
console.log('  plugin : ' + pkg.name + ' ' + pkg.version);
console.log('  commit : ' + commit);
console.log('  dsh    : ' + engineRange);
console.log('');
console.log('publish it:');
console.log('  https://cdn.jsdelivr.net/gh/Suqianqiana/dsh-float-islands@' + commit.slice(0, 7) + '/market/index.json');
console.log('users add that URL under Settings -> plugin market, then install from the list.');
