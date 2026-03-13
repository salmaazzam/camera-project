import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { embedImage } from "./_lib/image-utils.js";

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
    await runMiddleware(req, res, upload.array("images", 50));

    if (!req.files?.length) {
      return res.status(400).json({ error: "No images provided" });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const page = pdfDoc.addPage([612, 792]);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const jpegImage = await embedImage(pdfDoc, file.buffer);
      const imgDims = jpegImage.scale(1);

      const scale = Math.min(
        pageWidth / imgDims.width,
        pageHeight / imgDims.height
      );
      const width = imgDims.width * scale;
      const height = imgDims.height * scale;
      const x = (pageWidth - width) / 2;
      const y = pageHeight - height - 36;

      page.drawImage(jpegImage, { x, y, width, height });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=images.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Failed to create PDF" });
  }
}
