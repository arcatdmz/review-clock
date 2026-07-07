#!/usr/bin/env node
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = path.join(root, "dist");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log("Usage: review-clock [--host 127.0.0.1] [--port 9882]");
  process.exit(0);
}

const host = readOption("--host") ?? "127.0.0.1";
const port = Number(readOption("--port") ?? "9882");

if (!fs.existsSync(path.join(distRoot, "index.html"))) {
  console.error("dist/index.html is missing. Run `npm.cmd run build` in review-clock first.");
  process.exit(1);
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  const requestPath = decodeURIComponent(url.pathname);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.slice(1);
  const filePath = safeJoin(distRoot, relativePath) ?? path.join(distRoot, "index.html");
  sendFile(response, filePath);
});

server.listen(port, host, () => {
  console.log(`Review Clock: http://${host}:${port}/`);
});

function readOption(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function safeJoin(rootDir, relativePath) {
  const resolved = path.resolve(rootDir, relativePath);
  const rootWithSep = rootDir.endsWith(path.sep) ? rootDir : `${rootDir}${path.sep}`;
  if (resolved !== rootDir && !resolved.startsWith(rootWithSep)) return null;
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) return null;
  return resolved;
}

function sendFile(response, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
  }[ext] ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  fs.createReadStream(filePath).pipe(response);
}
