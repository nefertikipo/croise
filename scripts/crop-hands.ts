/** Crop candidate hand regions from the HERMES reference to pick a clean cut-out. */
import sharp from "sharp";

const P = ".context/attachments/qHJjSW/image.png"; // 754x1024

const regions: Record<string, { left: number; top: number; width: number; height: number }> = {
  "topleft-down": { left: 20, top: 14, width: 165, height: 175 },
  "topright-left": { left: 566, top: 14, width: 180, height: 175 },
  "midleft-right": { left: 12, top: 356, width: 185, height: 170 },
  "center-down": { left: 380, top: 520, width: 190, height: 190 },
};

async function main() {
  const S = 260;
  const tiles: Buffer[] = [];
  const labels = Object.keys(regions);
  for (const name of labels) {
    const t = await sharp(P)
      .extract(regions[name])
      .resize(S, S, { fit: "contain", background: { r: 20, g: 20, b: 20 } })
      .png()
      .toBuffer();
    tiles.push(t);
  }
  const GAP = 10;
  const W = tiles.length * S + (tiles.length + 1) * GAP;
  await sharp({ create: { width: W, height: S + GAP * 2, channels: 3, background: { r: 20, g: 20, b: 20 } } })
    .composite(tiles.map((input, i) => ({ input, left: GAP + i * (S + GAP), top: GAP })))
    .png()
    .toFile(".context/hand-candidates.png");
  console.log("wrote .context/hand-candidates.png:", labels.join(" | "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
