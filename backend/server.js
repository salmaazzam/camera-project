import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Put your PDF here: backend/template.pdf
const TEMPLATE_PDF_PATH = path.join(__dirname, "template.pdf");

// Target area for image insertion (PDF points: origin bottom-left, 72pt = 1 inch)
// Tweak these to match the white box in your template
const IMAGE_PLACEMENT = {
  x: 0,      // left edge of white box
  y: 335,      // bottom edge of white box
  width: 1600,  // width of white box
  height: 625, // height of white box
};

// Multer config - memory storage (we process in memory)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png/i.test(file.mimetype);
    if (allowed) cb(null, true);
    else cb(new Error("Only JPEG and PNG images are allowed"));
  },
});

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

/**
 * Embed image buffer into PDF doc. PDF-Lib supports JPEG and PNG natively.
 */
async function embedImage(pdfDoc, buffer, mimetype) {
  const isPng = /png/i.test(mimetype);
  const image = isPng
    ? await pdfDoc.embedPng(buffer)
    : await pdfDoc.embedJpg(buffer);
  return image;
}

/**
 * POST /api/insert-image
 * Loads template PDF from backend/template.pdf, inserts the dropped image
 * on the first page (centered), returns the modified PDF.
 */
app.post("/api/insert-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const templateExists = await fs.access(TEMPLATE_PDF_PATH).then(() => true).catch(() => false);
    if (!templateExists) {
      return res.status(500).json({
        error: "Template PDF not found. Put your PDF at backend/template.pdf",
      });
    }

    const templateBuffer = await fs.readFile(TEMPLATE_PDF_PATH);
    const pdfDoc = await PDFDocument.load(templateBuffer);
    const pages = pdfDoc.getPages();
    const page = pages[0];

    if (!page) {
      return res.status(500).json({ error: "Template PDF has no pages" });
    }

    const image = await embedImage(pdfDoc, req.file.buffer, req.file.mimetype);
    const imgDims = image.scale(1);
    const { x: boxX, y: boxY, width: boxW, height: boxH } = IMAGE_PLACEMENT;

    // Scale image to fit inside the white box, maintain aspect ratio
    const scale = Math.min(boxW / imgDims.width, boxH / imgDims.height);
    const width = imgDims.width * scale;
    const height = imgDims.height * scale;
    // Center within the box
    const x = boxX + (boxW - width) / 2;
    const y = boxY + (boxH - height) / 2;

    page.drawImage(image, { x, y, width, height });

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=document.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to insert image into PDF" });
  }
});

/**
 * POST /api/images-to-pdf
 * Accepts multiple images, creates a PDF with one image per page
 */
app.post("/api/images-to-pdf", upload.array("images", 50), async (req, res) => {
  try {
    if (!req.files?.length) {
      return res.status(400).json({ error: "No images provided" });
    }

    const pdfDoc = await PDFDocument.create();

    for (const file of req.files) {
      const page = pdfDoc.addPage([612, 792]);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const jpegImage = await embedImage(pdfDoc, file.buffer, file.mimetype);
      const imgDims = jpegImage.scale(1);

      // Scale to fit page while maintaining aspect ratio
      const scale = Math.min(pageWidth / imgDims.width, pageHeight / imgDims.height);
      const width = imgDims.width * scale;
      const height = imgDims.height * scale;
      const x = (pageWidth - width) / 2;
      const y = pageHeight - height - 36; // 36pt top margin

      page.drawImage(jpegImage, {
        x,
        y,
        width,
        height,
      });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=images.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to create PDF" });
  }
});

/**
 * POST /api/add-to-existing-pdf
 * Accepts a PDF file + images, adds images as new pages at the end
 */
app.post("/api/add-to-existing-pdf", upload.fields([
  { name: "pdf", maxCount: 1 },
  { name: "images", maxCount: 50 },
]), async (req, res) => {
  try {
    const pdfFile = req.files?.pdf?.[0];
    const imageFiles = req.files?.images || [];

    if (!pdfFile) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    const pdfDoc = await PDFDocument.load(pdfFile.buffer);

    for (const file of imageFiles) {
      const page = pdfDoc.addPage([612, 792]);
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const jpegImage = await embedImage(pdfDoc, file.buffer, file.mimetype);
      const imgDims = jpegImage.scale(1);
      const scale = Math.min(pageWidth / imgDims.width, pageHeight / imgDims.height);
      const width = imgDims.width * scale;
      const height = imgDims.height * scale;
      const x = (pageWidth - width) / 2;
      const y = pageHeight - height - 36;

      page.drawImage(jpegImage, { x, y, width, height });
    }

    const pdfBytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=document-with-images.pdf");
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to add images to PDF" });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Serve static frontend (only in production)
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

// SPA fallback – must come after API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
