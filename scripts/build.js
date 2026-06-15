// Build script: copies source files into build/timewise/ for
// Chrome Web Store packaging and unpacked-extension loading.
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEST = path.join(ROOT, 'build', 'timewise');

// Clean destination (preserve .crx and .pem at the parent level)
fs.rmSync(DEST, { recursive: true, force: true });
fs.mkdirSync(DEST, { recursive: true });

// Directories copied in full
const dirs = ['lib', 'ui', '_locales'];
for (const dir of dirs) {
  copyDir(path.join(ROOT, dir), path.join(DEST, dir));
}
// Only package extension icons — screenshots and promo are store-listing only
copyDir(path.join(ROOT, 'assets', 'icons'), path.join(DEST, 'assets', 'icons'));

const files = ['manifest.json', 'background.js'];
for (const file of files) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DEST, file));
}

console.log('Build complete: build/timewise/');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}
