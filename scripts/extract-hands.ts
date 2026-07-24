/** Extract per-direction hand cut-outs from the HERMES reference into
 * public/motifs, keeping their vintage paper ground. pnpm tsx scripts/extract-hands.ts */
import sharp from "sharp";

const P = ".context/attachments/qHJjSW/image.png"; // 754x1024

// Inset a little from each cell so no neighbouring border/colour bleeds in.
const crops: Record<string, { left: number; top: number; width: number; height: number }> = {
  down: { left: 26, top: 22, width: 154, height: 144 },
  left: { left: 576, top: 22, width: 156, height: 148 },
  right: { left: 24, top: 362, width: 156, height: 146 },
};

async function main() {
  const strip: Buffer[] = [];
  for (const [dir, c] of Object.entries(crops)) {
    const out = `public/motifs/hand-${dir}.png`;
    await sharp(P).extract(c).resize(360, 360, { fit: "fill" }).png().toFile(out);
    console.log("wrote", out);
    strip.push(await sharp(out).resize(220, 220, { fit: "fill" }).png().toBuffer());
  }
  const S = 220;
  const GAP = 10;
  const W = strip.length * S + (strip.length + 1) * GAP;
  await sharp({ create: { width: W, height: S + GAP * 2, channels: 3, background: { r: 20, g: 20, b: 20 } } })
    .composite(strip.map((input, i) => ({ input, left: GAP + i * (S + GAP), top: GAP })))
    .png()
    .toFile(".context/hands-extracted.png");
  console.log("wrote .context/hands-extracted.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
