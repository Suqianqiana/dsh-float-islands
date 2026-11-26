#!/usr/bin/env node
/**
 * Rename the package everywhere it is spelled out, and point the metadata at a
 * repository. Run it when the plugin is ready to leave the "@local" scope.
 *
 *   node scripts/rename.mjs --name dsh-float-islands --repo https://github.com/USER/dsh-float-islands
 *   node scripts/rename.mjs --name @user/dsh-float-islands --repo ... --dry-run
 *
 * It rewrites:
 *   - package.json  name / homepage / repository.url / bugs.url
 *   - cordis.patch.yml  the inserted bundle name
 *   - client.js  the module-loader id and the PKG constant
 *
 * It does NOT touch the installed profile. After renaming, the profile still
 * points at the old name: update the dependency key and the bundles entry, then
 * restart DSH completely (the client manifest is read once at boot).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const get = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const dryRun = args.includes('--dry-run');
const name = get('--name');
const repo = get('--repo');

if (!name || !repo) {
  console.error('usage: node scripts/rename.mjs --name <package-name> --repo <https://github.com/user/repo> [--dry-run]');
  process.exit(2);
}
const NAME_RE = /^(@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
if (!NAME_RE.test(name)) {
  console.error('invalid package name: ' + name);
  process.exit(2);
}
if (!repo.startsWith('https://')) {
  console.error('repository must be an https URL');
  process.exit(2);
}

const pkgPath = path.join(root, 'package.json');
const patchPath = path.join(root, 'cordis.patch.yml');
const clientPath = path.join(root, 'client.js');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const oldName = pkg.name;
if (oldName === name) console.log('package name already ' + name);

pkg.name = name;
pkg.private = false;
pkg.homepage = repo + '#readme';
pkg.repository = { type: 'git', url: 'git+' + repo + '.git' };
pkg.bugs = { url: repo + '/issues' };

const patch = fs.readFileSync(patchPath, 'utf8');
const client = fs.readFileSync(clientPath, 'utf8');
const occurrences = client.split(oldName).length - 1;

const nextPatch = patch.split(oldName).join(name);
const nextClient = client.split(oldName).join(name);

console.log('package : ' + oldName + ' -> ' + name);
console.log('patch   : ' + (patch === nextPatch ? 'unchanged' : 'updated'));
console.log('client  : ' + occurrences + ' occurrence(s) replaced');
console.log('repo    : ' + repo);

if (dryRun) {
  console.log('dry run: nothing written');
  process.exit(0);
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + String.fromCharCode(10));
fs.writeFileSync(patchPath, nextPatch);
fs.writeFileSync(clientPath, nextClient);

console.log('');
console.log('next steps');
console.log('  1. profile package.json: rename the dependency key and the dsh.profile.bundles entry');
console.log('  2. re-link: remove the old link and add link:<this directory>');
console.log('  3. restart DSH completely (client manifests are read at boot)');
console.log('  4. verify: the island still renders and the settings page still opens');
