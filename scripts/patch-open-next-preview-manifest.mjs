import { readFile, writeFile } from "node:fs/promises";

const adapterFile = new URL(
  "../node_modules/@opennextjs/cloudflare/dist/cli/build/patches/plugins/load-manifest.js",
  import.meta.url,
);
const source = await readFile(adapterFile, "utf8");
const original =
  "**/{*-manifest,required-server-files,prefetch-hints}.json";
const patched =
  "**/{*-manifest,required-server-files,prefetch-hints,preview-props}.json";

if (source.includes(patched)) {
  process.exit(0);
}

if (!source.includes(original)) {
  throw new Error(
    "OpenNext load-manifest patch target changed; review Next preview manifest support.",
  );
}

await writeFile(adapterFile, source.replace(original, patched));
