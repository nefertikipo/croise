/** Client-side helper: crop an image (data URL) to a pixel rect → JPEG data URL.
 * Used to build the on-screen cover preview from the user's chosen crop. */
export async function getCroppedDataUrl(
  src: string,
  pixels: { x: number; y: number; width: number; height: number },
): Promise<string> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(pixels.width));
  canvas.height = Math.max(1, Math.round(pixels.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return src;
  ctx.drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
