/**
 * Batch icon generator — direct PixelLab SDK (bypasses the broken MCP wrapper,
 * which returns "Response validation failed" on every generate call).
 *
 * Auth: PIXELLAB_SECRET env var. NEVER hardcode the secret here — pass it at
 * run time, e.g. extracted from the MCP config:
 *   SECRET=$(claude mcp list | grep -oE 'secret=[a-f0-9-]+' | cut -d= -f2)
 *   PIXELLAB_SECRET="$SECRET" node scripts/generate-icons.cjs <manifest.json> <outDir>
 *
 * Manifest: { icons: [ { name, subject } ... ] } (see docs/rebuild/ux/ICON-STYLE-SPEC.md).
 * Locked style: 64x64, no background, single black outline, basic shading,
 * medium detail, warm flat pixel palette — one coherent family.
 *
 * Quota-aware: sequential with a small delay; retries once on transient error;
 * skips icons whose PNG already exists in outDir (resumable).
 */
const fs = require("node:fs");
const path = require("node:path");
const { PixelLabClient } = require("/home/khujta/.claude/mcp-servers/pixellab/node_modules/@pixellab-code/pixellab");

const STYLE_SUFFIX =
  "single object, centered, fills the frame, pixel art game icon, clean thick dark outline, flat warm colors, simple";
const NEGATIVE =
  "glossy, gradient, 3d render, realistic, photo, drop shadow, blurry, anti-aliased, text, watermark, multiple objects";
const LOCKED = {
  imageSize: { width: 64, height: 64 },
  noBackground: true,
  outline: "single color black outline",
  shading: "basic shading",
  detail: "medium detail",
  textGuidanceScale: 9,
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function genOne(client, name, subject, outDir) {
  const out = path.join(outDir, `${name}.png`);
  if (fs.existsSync(out)) return "skip";
  const description = `${subject}, ${STYLE_SUFFIX}`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const r = await client.generateImagePixflux({ description, negativeDescription: NEGATIVE, ...LOCKED });
      await r.image.saveToFile(out);
      return "ok";
    } catch (e) {
      if (attempt === 2) return `ERR ${e.message || e}`;
      await sleep(1500);
    }
  }
}

(async () => {
  const [manifestPath, outDir] = process.argv.slice(2);
  if (!manifestPath || !outDir) {
    console.error("usage: node generate-icons.cjs <manifest.json> <outDir>");
    process.exit(1);
  }
  if (!process.env.PIXELLAB_SECRET) {
    console.error("PIXELLAB_SECRET not set");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const { icons } = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const client = new PixelLabClient(process.env.PIXELLAB_SECRET);
  let ok = 0,
    skip = 0,
    err = 0;
  for (let i = 0; i < icons.length; i++) {
    const { name, subject } = icons[i];
    const res = await genOne(client, name, subject, outDir);
    if (res === "ok") ok++;
    else if (res === "skip") skip++;
    else err++;
    console.log(`[${i + 1}/${icons.length}] ${name}: ${res}`);
    if (res === "ok") await sleep(400);
  }
  console.log(`\nDONE — ok:${ok} skip:${skip} err:${err}`);
})();
