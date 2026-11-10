/**
 * Cut a release.
 *
 *     npm run release 0.4.0
 *
 * Sets the version in all three files, commits that, tags it `v0.4.0`, and pushes both. The
 * push of the tag is what starts the Release workflow, which builds x64 and ARM64 in parallel
 * and attaches both installers to a **draft** Release for you to publish.
 *
 * Refuses to run on a dirty tree, on a tag that already exists, or off the main branch —
 * each of those produces a release that does not match what anybody can check out, and all
 * three are easier to prevent than to explain afterwards.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function fail(message, ...rest) {
  console.error(`\n${message}`);
  for (const line of rest) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

const version = process.argv[2];

if (!version) fail('Usage: npm run release <version>', 'e.g. npm run release 0.4.0');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`"${version}" is not a plain semver version.`, 'Write 0.4.0 — the tag adds the v.');
}

const tag = `v${version}`;

// A dirty tree means the tag would not describe what was built.
if (git('status', '--porcelain')) {
  fail('Working tree is not clean.', 'Commit or stash first, then run this again.');
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD');
if (branch !== 'main') {
  fail(
    `On branch "${branch}", not main.`,
    'Releases are cut from main so the tag matches what people clone.',
  );
}

const existing = git('tag', '--list', tag);
if (existing) {
  fail(`Tag ${tag} already exists.`, 'Pick the next version, or delete that tag first.');
}

console.log(`Setting version to ${version}…\n`);
execFileSync(process.execPath, [join(ROOT, 'scripts', 'set-version.mjs'), version], {
  cwd: ROOT,
  stdio: 'inherit',
});

const current = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;
if (current !== version) fail('Version did not take. Nothing has been committed or tagged.');

console.log('\nCommitting and tagging…');
git('add', 'package.json', 'src-tauri/Cargo.toml', 'src-tauri/tauri.conf.json');
git('commit', '-m', `chore: release ${tag}`);
git('tag', '-a', tag, '-m', `The Next Generation ${tag}`);

console.log('Pushing…');
git('push', 'origin', branch);
git('push', 'origin', tag);

console.log(`
Done. ${tag} is pushed.

GitHub is now building x64 and ARM64 in parallel. When both finish they attach their
installers to a DRAFT release — open the repo's Releases tab, check both files are there,
and publish it. Staff download from that page.
`);
