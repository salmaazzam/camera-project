import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import { embedImage } from "./_lib/image-utils.js";

const TEMPLATE_PDF_PATH = path.join(process.cwd(), "api/_lib/template.pdf");

// Target area for image insertion (PDF points: origin bottom-left, 72pt = 1 inch)
const IMAGE_PLACEMENT = {
  x: 333,
  y: 335,
  width: 534,
  height: 625,
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only JPEG and PNG images are allowed"));
  },
});

function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).end();
  }

  try {
    await runMiddleware(req, res, upload.single("image"));

    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const templateExists = await fs
      .access(TEMPLATE_PDF_PATH)
      .then(() => true)
      .catch(() => false);

    if (!templateExists) {
      return res.status(500).json({
        error: "Template PDF not found on the server.",
      });
    }

    const templateBuffer = await fs.readFile(TEMPLATE_PDF_PATH);
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const page = pdfDoc.getPages()[0];

    if (!page) {
      return res.status(500).json({ error: "Template PDF has no pages" });
    }

    const image = await embedImage(pdfDoc, req.file.buffer);
    const imgDims = image.scale(1);
    const { x: boxX, y: boxY, width: boxW, height: boxH } = IMAGE_PLACEMENT;

    const scale = Math.min(boxW / imgDims.width, boxH / imgDims.height);
    const width = imgDims.width * scale;
    const height = imgDims.height * scale;
    const x = boxX + (boxW - width) / 2;
    const y = boxY + (boxH - height) / 2;

    page.drawImage(image, { x, y, width, height });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=document.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Failed to insert image into PDF" });
  }
}
