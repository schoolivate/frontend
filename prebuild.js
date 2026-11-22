import fs from "node:fs/promises";
import path from "node:path";
const INPUT_DIR = "./renderable";
const OUTPUT_FILE = "./server/renderable.js";
const matches = (filename) => true;
async function collectFiles(directory) {
  const entries = await fs.readdir(directory, {
    withFileTypes: true,
  });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...await collectFiles(fullPath));
    } else if (matches(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}
const files = await collectFiles(INPUT_DIR);
const exports = {};
for (const file of files) {
  const relativePath = path
    .relative(INPUT_DIR, file)
    .replaceAll(path.sep, "/");
  const content = await fs.readFile(file, "utf8");
  exports[relativePath] = content;
}
await fs.mkdir(path.dirname(OUTPUT_FILE), {
  recursive: true,
});
await fs.writeFile(
  OUTPUT_FILE,
  `export default ${JSON.stringify(exports, null, 2)};\n`
);
console.log("cwd:",process.cwd());