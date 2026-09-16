import { cpSync, mkdirSync, rmSync } from "node:fs";

const OUT = "dist";
const entries = ["index.html", "js", "public", "vendor"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const entry of entries) {
  cpSync(entry, `${OUT}/${entry}`, { recursive: true });
}
