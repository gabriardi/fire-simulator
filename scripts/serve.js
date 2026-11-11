// A static server for working on the site locally, with the same headers as production (_headers).
//   node scripts/serve.js            # http://127.0.0.1:8000
//   node scripts/serve.js --lan      # also from a phone on the same network
//   PORT=9000 node scripts/serve.js
import { readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PORT = Number(process.env.PORT) || 8000;
const LAN = process.argv.includes("--lan");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

// _headers: a path pattern on its own line, then indented "Name: value" lines.
function parseHeaders() {
  const rules = [];
  let current = null;
  for (const line of readFileSync(join(ROOT, "_headers"), "utf8").split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: new RegExp(`^${line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`), headers: {} };
      rules.push(current);
    } else if (current) {
      const i = line.indexOf(":");
      current.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
  return rules;
}
const RULES = parseHeaders();

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = resolve(ROOT, `.${path}`);
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return send(res, 403, "Forbidden");
  if (path.split("/").some((part) => part.startsWith("."))) return send(res, 404, "Not found");
  try {
    let info = await stat(file).catch(() => null);
    if (!info && !extname(file)) {
      file += ".html"; // as Cloudflare serves it: /privacy is privacy.html
      info = await stat(file);
    }
    if (info?.isDirectory()) file = join(file, "index.html");
    const body = await readFile(file);
    const headers = { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-cache" };
    for (const r of RULES) if (r.pattern.test(path)) Object.assign(headers, r.headers);
    res.writeHead(200, headers);
    res.end(body);
  } catch {
    send(res, 404, "Not found");
  }
}).listen(PORT, LAN ? "0.0.0.0" : "127.0.0.1", () => {
  console.log(`When can I stop? http://127.0.0.1:${PORT}`);
  if (LAN) {
    for (const nets of Object.values(networkInterfaces())) {
      for (const n of nets ?? []) if (n.family === "IPv4" && !n.internal) console.log(`On your network: http://${n.address}:${PORT}`);
    }
  }
});

function send(res, status, text) {
  res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
  res.end(text);
}
