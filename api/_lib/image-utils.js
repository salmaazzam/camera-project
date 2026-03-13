import sharp from "sharp";

/**
 * Auto-rotate based on EXIF orientation and return a JPEG buffer that
 * pdf-lib can embed without any rotation surprises.
 */
export async function normalizeImage(buffer) {
  const rotated = await sharp(buffer).rotate().toBuffer();
  const { width, height } = await sharp(rotated).metadata();
  if (width > height) {
    return sharp(rotated).rotate(90).jpeg().toBuffer();
  }
  return sharp(rotated).jpeg().toBuffer();
}

export async function embedImage(pdfDoc, buffer) {
  const normalized = await normalizeImage(buffer);
  return pdfDoc.embedJpg(normalized);
}
