import multer from "multer";
import { PDFDocument } from "pdf-lib";
import { embedImage } from "./_lib/image-utils.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only JPEG, PNG, and PDF files are allowed"));
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
    await runMiddleware(
      req,
      res,
      upload.fields([
        { name: "pdf", maxCount: 1 },
        { name: "images", maxCount: 50 },
      ])
    );

    const pdfFile = req.files?.pdf?.[0];
    const imageFiles = req.files?.images || [];

    if (!pdfFile) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const pdfDoc = await PDFDocument.load(pdfFile.buffer);

    for (const file of imageFiles) {
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
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=document-with-images.pdf"
    );
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: err.message || "Failed to add images to PDF" });
  }
}
