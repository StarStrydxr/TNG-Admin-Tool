/**
 * Set the app version in all three places at once.
 *
 *     node scripts/set-version.mjs 0.4.0
 *
 * The version lives in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`,
 * and nothing keeps them in step. Tauri reads its own, Cargo reads its own, and an installer
 * built from files that disagree is named one thing and reports another — which is exactly the
 * sort of thing nobody notices until a staff tester reports a bug against the wrong build.
 *
 * Writes nothing unless all three files parse and the version is well-formed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const version = process.argv[2];

if (!version) {
  console.error('Usage: node scripts/set-version.mjs <version>   (e.g. 0.4.0)');
  process.exit(1);
}

// Cargo and Tauri both want plain semver, so a leading `v` is a mistake worth catching rather
// than quietly stripping — the tag carries the `v`, the files do not.
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(
    `"${version}" is not a plain semver version. Write 0.4.0, not v0.4.0 and not 0.4.`,
  );
  process.exit(1);
}

/** Read, transform, and hold the result until every file has been done. */
const edits = [];

function stage(relative, transform) {
  const path = join(ROOT, relative);
  const before = readFileSync(path, 'utf8');
  const after = transform(before, path);
  edits.push({ path, relative, after, changed: before !== after });
}

stage('package.json', (text, path) => {
  const json = JSON.parse(text);
  json.version = version;
  // Two-space indent and a trailing newline, the way npm writes it.
  return `${JSON.stringify(json, null, 2)}\n`;
});

stage('src-tauri/tauri.conf.json', (text) => {
  const json = JSON.parse(text);
  json.version = version;
  return `${JSON.stringify(json, null, 2)}\n`;
});

// Only the version in [package] — a dependency's version pin must not be touched, so the
// match is anchored to the first `version = "..."` after the `[package]` header.
stage('src-tauri/Cargo.toml', (text, path) => {
  const pattern = /(\[package\][^\[]*?\bversion\s*=\s*")[^"]*(")/;
  if (!pattern.test(text)) {
    throw new Error(`No [package] version found in ${path}`);
  }
  return text.replace(pattern, `$1${version}$2`);
});

for (const edit of edits) {
  writeFileSync(edit.path, edit.after);
  console.log(`${edit.changed ? 'set ' : 'same'}  ${edit.relative}`);
}

console.log(`\nVersion is now ${version}.`);
console.log('Cargo.lock updates itself on the next build.');
