import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
let checkedFiles = 0;

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.tmp' || entry.name === 'vendor' || entry.name === 'node_modules') continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      checkedFiles += 1;
      try {
        execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
      } catch (error) {
        failures.push(`${path.relative(root, fullPath)}: syntax error\n${error.stderr?.toString() ?? ''}`);
      }
    }
  }
}

await walk(path.join(root, 'src'));
await walk(path.join(root, 'tests'));
await walk(path.join(root, 'scripts'));

try {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  if (pkg.name !== 'useless-box') failures.push('package.json: unexpected package name');
  if (pkg.type !== 'module') failures.push('package.json: type must be module');
} catch (error) {
  failures.push(`package.json: ${error.message}`);
}

const html = await readFile(path.join(root, 'index.html'), 'utf8');
for (const required of [
  'twitter:card',
  'twitter:player',
  'twitter:player:width',
  'twitter:player:height',
  'twitter:image',
  'type="importmap"',
  'src="./src/main.js"',
]) {
  if (!html.includes(required)) failures.push(`index.html: missing ${required}`);
}

if (html.includes('cdn.jsdelivr.net') || html.includes('unpkg.com')) {
  failures.push('index.html: runtime CDN dependency found');
}

for (const requiredFile of [
  'vendor/three.module.js',
  'vendor/three.core.js',
  'vendor/THREE-LICENSE.txt',
  '.nojekyll',
  'preview.png',
]) {
  try {
    const info = await stat(path.join(root, requiredFile));
    if (!info.isFile()) failures.push(`${requiredFile}: not a file`);
  } catch {
    failures.push(`${requiredFile}: missing`);
  }
}

try {
  const preview = await readFile(path.join(root, 'preview.png'));
  const isPng = preview.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const width = preview.readUInt32BE(16);
  const height = preview.readUInt32BE(20);
  if (!isPng) failures.push('preview.png: not a PNG');
  if (width !== 480 || height !== 480) {
    failures.push(`preview.png: expected 480x480, found ${width}x${height}`);
  }
} catch (error) {
  failures.push(`preview.png: could not validate (${error.message})`);
}

if (failures.length > 0) {
  console.error('Check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Check passed. ${checkedFiles} JavaScript files are syntactically valid.`);
