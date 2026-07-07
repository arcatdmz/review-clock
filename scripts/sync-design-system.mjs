import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const candidates = [
  process.env.MINI_TOOL_DESIGN_SYSTEM_DIST,
  path.join(root, "..", "mini-tool-design-system", "dist"),
  path.join(root, "mini-tool-design-system", "dist"),
].filter(Boolean);

const sourceDir = candidates.find((candidate) =>
  fs.existsSync(path.join(candidate, "mini-tool.css")),
);

if (!sourceDir) {
  const fallback = path.join(root, "public", "vendor", "mini-tool-design-system", "mini-tool.css");
  if (fs.existsSync(fallback)) {
    console.warn("External design CSS was not found; using the committed fallback CSS.");
    process.exit(0);
  }
  console.error("External design CSS was not found and no fallback CSS is committed.");
  console.error("Set MINI_TOOL_DESIGN_SYSTEM_DIST to a directory that contains mini-tool.css.");
  process.exit(1);
}

const targetDir = path.join(root, "public", "vendor", "mini-tool-design-system");
fs.mkdirSync(targetDir, { recursive: true });
fs.copyFileSync(
  path.join(sourceDir, "mini-tool.css"),
  path.join(targetDir, "mini-tool.css"),
);
console.log(`Synced ${path.relative(root, targetDir)} from ${sourceDir}`);
