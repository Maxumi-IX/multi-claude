// Copies the static renderer files (html/css) that tsc doesn't touch into
// dist/renderer, next to the compiled renderer.js, after every build.
const fs = require("node:fs");
const path = require("node:path");

const files = [
  ["src/renderer/index.html", "dist/renderer/index.html"],
  ["src/renderer/styles.css", "dist/renderer/styles.css"],
];

for (const [from, to] of files) {
  const src = path.join(__dirname, "..", from);
  const dest = path.join(__dirname, "..", to);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  console.log(`copied ${from} -> ${to}`);
}
