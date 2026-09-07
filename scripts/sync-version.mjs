import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;

const manifestPath = "public/manifest.webmanifest";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
manifest.version = version;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const swPath = "public/sw.js";
let sw = readFileSync(swPath, "utf8");
sw = sw.replace(/const CACHE_NAME = "[^"]+";/, `const CACHE_NAME = "worksphere-shell-v${version}";`);
writeFileSync(swPath, sw);

console.log(`WorkSphere PWA version synced: ${version}`);
