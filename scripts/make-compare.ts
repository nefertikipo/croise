/** Test a detailed vintage manicule (pointing hand) on a paper cell, 4 directions. */
import sharp from "sharp";

const S = 300;
const PAPER = "#e9e0cf";
const INK = "#171512";

/** Detailed pointing hand (manicule) pointing RIGHT, drawn in a 130x90 space.
 * Filled ink silhouette + cream crease lines for an engraved look. */
function handArt(): string {
  const c = PAPER;
  return `
    <!-- shirt cuff -->
    <path d="M2 30 L26 24 L26 66 L2 60 Z" fill="${INK}"/>
    <path d="M22 24 h7 v42 h-7 Z" fill="${INK}"/>
    <!-- palm / fist -->
    <rect x="27" y="22" width="42" height="46" rx="14" fill="${INK}"/>
    <!-- index finger, tapered, pointing right -->
    <path d="M58 30 Q112 28 122 35 Q124 37 122 39 Q112 46 58 44 Z" fill="${INK}"/>
    <!-- fingernail -->
    <path d="M116 34 Q120 37 116 40" fill="none" stroke="${c}" stroke-width="1.4"/>
    <!-- thumb, bent, on top of fist -->
    <path d="M40 24 Q42 8 56 8 Q64 8 64 15 Q64 22 52 24 Z" fill="${INK}"/>
    <!-- three curled fingers on the lower right of the fist -->
    <rect x="52" y="44" width="22" height="9" rx="4.5" fill="${INK}"/>
    <rect x="51" y="52" width="20" height="9" rx="4.5" fill="${INK}"/>
    <rect x="50" y="60" width="18" height="9" rx="4.5" fill="${INK}"/>
    <!-- cream creases between fingers + palm edge -->
    <path d="M54 48.5 h20" stroke="${c}" stroke-width="1.3"/>
    <path d="M53 56.5 h18" stroke="${c}" stroke-width="1.3"/>
    <path d="M56 44 Q60 40 66 40" stroke="${c}" stroke-width="1.3" fill="none"/>
    <!-- cuff seam -->
    <path d="M9 33 L9 57" stroke="${c}" stroke-width="1.3"/>`;
}

const ROT: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

function handCell(dir: string): Promise<Buffer> {
  const scale = (S * 0.6) / 130;
  const cx = S / 2;
  const cy = S / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
    <rect width="${S}" height="${S}" fill="${PAPER}"/>
    <g transform="rotate(${ROT[dir]} ${cx} ${cy}) translate(${cx} ${cy}) scale(${scale}) translate(-65 -45)">
      ${handArt()}
    </g>
    <text x="6" y="20" font-family="sans-serif" font-size="15" fill="#000">${dir}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function main() {
  const imgs = await Promise.all(["right", "down", "left", "up"].map(handCell));
  const GAP = 12;
  const W = imgs.length * S + (imgs.length + 1) * GAP;
  await sharp({ create: { width: W, height: S + GAP * 2, channels: 3, background: { r: 30, g: 30, b: 30 } } })
    .composite(imgs.map((input, i) => ({ input, left: GAP + i * (S + GAP), top: GAP })))
    .png()
    .toFile(".context/hand-exp.png");
  console.log("wrote .context/hand-exp.png (right | down | left | up)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
