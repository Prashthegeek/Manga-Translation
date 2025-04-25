// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import path from "path";
// import fs from "fs";
// import axios from "axios";
// import cloudinary from "./services/cloudinary/cloudinary.js";
// import upload from "./services/cloudinary/upload.js"; // our configured Multer
// import { processAllPages } from "./controllers/geminiController.js";
// import { fromBuffer } from "pdf2pic";

// // pdf-lib and fontkit setup
// import { degrees, PDFDocument, rgb } from "pdf-lib";
// // Use a namespace import for fontkit (ensure you installed @pdf-lib/fontkit)
// import  fontkit from '@pdf-lib/fontkit';


// // streamifier for Cloudinary upload
// import streamifier from "streamifier";

// const app = express();
// app.use(cors());

// /**
//  * Upload a PDF buffer to Cloudinary. 
//  * Cloudinary will treat it as a PDF file due to resource_type "raw" and public_id ending with .pdf.
//  */
// const uploadPdfToCloudinary = (buffer) => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         resource_type: "raw",
//         folder: "manga_backend",
//         public_id: `modified_${Date.now()}.pdf`,
//         format: "pdf",
//       },
//       (error, result) => {
//         if (error) return reject(error);
//         resolve(result);
//       }
//     );
//     streamifier.createReadStream(buffer).pipe(uploadStream);
//   });
// };

// /**
//  * Adjust bounding box from image (1024x1024) coordinates to PDF page coordinates.
//  * Assumes boundingBox has { x, y, width, height } from a top-left origin.
//  */
// const adjustCoordinates = (boundingBox, pageWidth, pageHeight, imageWidth = 1024, imageHeight = 1024) => {
//   const scaledX = boundingBox.x * (pageWidth / imageWidth);
//   const scaledYFromTop = boundingBox.y * (pageHeight / imageHeight);
//   const scaledWidth = boundingBox.width * (pageWidth / imageWidth);
//   const scaledHeight = boundingBox.height * (pageHeight / imageHeight);
  
//   // Convert y: PDF-lib uses bottom-left origin.
//   const adjustedY = pageHeight - scaledYFromTop - scaledHeight;
//   return { x: scaledX, y: adjustedY, width: scaledWidth, height: scaledHeight };
// };

// /**
//  * Revised function: Draw a white rectangle and then overlay the translated text.
//  * This version dynamically adjusts the font size so that the text fits within the bounding box.
//  */
// const overlayTranslations = (pdfDoc, geminiResult, customFont) => {
//   const pages = pdfDoc.getPages();

//   // Iterate over each page's result (geminiResult.page is 1-indexed)
//   for (let i = 0; i < geminiResult.length; i++) {
//     const { page, translations } = geminiResult[i];
//     const pdfPage = pages[page - 1];
//     const { width: pageWidth, height: pageHeight } = pdfPage.getSize();

//     // Process each translation block for the page.
//     translations.forEach(translation => {
//       const { boundingBox, translatedText } = translation;
//       // Adjust the bounding box: scale from 1024x1024 to current page dimensions.
//       const adjustedBox = adjustCoordinates(boundingBox, pageWidth, pageHeight);
//       console.log(`Adjusted bounding box on page ${page}:`, adjustedBox);

//       // Draw a white rectangle as background.
//       pdfPage.drawRectangle({
//         x: adjustedBox.x,
//         y: adjustedBox.y,
//         width: adjustedBox.width,
//         height: adjustedBox.height,
//         color: rgb(1, 1, 1),
//         borderColor: rgb(0.8, 0.8, 0.8),
//         borderWidth: 1,
//         opacity: 0.75,
//       });

//       const margin = 5; // Padding within the box.
//       const maxWidth = adjustedBox.width - 2 * margin;

//       // Split the translated text by newline.
//       // If Gemini returns multi-line text as one string with "\n", split it.
//       const lines = translatedText.split("\n").map(l => l.trim()).filter(Boolean);
//       // Start with an initial font size relative to box height, e.g., 50% of box height.
//       let fontSize = adjustedBox.height * 0.5;
//       const minFontSize = 8;
//       // Reduce fontSize if any line exceeds maxWidth
//       while (fontSize > minFontSize) {
//         let tooWide = false;
//         for (const line of lines) {
//           const lineWidth = customFont.widthOfTextAtSize(line, fontSize);
//           if (lineWidth > maxWidth) {
//             tooWide = true;
//             break;
//           }
//         }
//         if (!tooWide) break;
//         fontSize -= 1;
//       }
//       const lineHeight = fontSize * 1.2;
//       const totalTextHeight = lines.length * lineHeight;
//       // Position text vertically centered within the bounding box.
//       const textStartY = adjustedBox.y + (adjustedBox.height - totalTextHeight) / 2;

//       lines.forEach((line, index) => {
//         // pdf-lib draws text from the bottom of the text, so we draw lines from bottom to top.
//         const yPos = textStartY + (lines.length - index - 1) * lineHeight;
//         pdfPage.drawText(line, {
//           x: adjustedBox.x + margin,
//           y: yPos,
//           size: fontSize,
//           font: customFont,
//           color: rgb(0, 0, 0),
//           maxWidth: maxWidth,
//         });
//       });
//     });
//   }
//   return pdfDoc;
// };

// app.post("/upload", upload.single("file"), async (req, res) => {
//   let geminiResult, pdfBuffer;
//   try {
//     if (req.file && req.file.path) {
//       console.log("File uploaded successfully with URL:", req.file.path);
//       if (
//         req.file.mimetype === "application/pdf" ||
//         req.file.format === "pdf"
//       ) {
//         const pdfResponse = await axios.get(req.file.path, {
//           responseType: "arraybuffer",
//         });
//         pdfBuffer = Buffer.from(pdfResponse.data);

        
//         // Set up pdf2pic conversion options.
//         const options = {
//           density: 300,
//           format: "png",
//           width: 1024,
//           height: 1024,
//           savePath: "./temp",
//           saveFilename: "page",
//         };

//         const converter = fromBuffer(pdfBuffer, options);
//         const pagesData = await converter.bulk(-1);
//         console.log("pdf2pic pagesData:", pagesData);

//         const base64Images = pagesData.map((page) => {
//           const fullPath = path.resolve(page.path);
//           const imageBuffer = fs.readFileSync(fullPath);
//           return imageBuffer.toString("base64");
//         });

//         console.log("base64Images are -> " , base64Images);

//         // Process these images with Gemini (the function processAllPages is assumed to exist).
//         geminiResult = await processAllPages(base64Images);
//         console.log("Gemini results:", geminiResult);
//       } else {
//         console.log("Uploaded file is not a PDF.");
//         return res.json({ message: "File is an image. Process with image pipeline." });
//       }
//     } else {
//       console.log("No file or URL found in req.file.");
//       return res.status(400).json({ error: "File upload failed." });
//     }
//   } catch (e) {
//     console.error("Error in upload route:", e.message);
//     return res.status(500).json({ error: "Processing failed." });
//   }

//   try {
//     // Use pdf-lib to modify the original PDF.
//     const pdfDoc = await PDFDocument.load(pdfBuffer);
//     pdfDoc.registerFontkit(fontkit);
//     // Read and embed custom font (NotoSans) for full Unicode support.
//     const fontPath = "./fonts/NotoSans-VariableFont_wdth,wght.ttf";
//     const fontToUse = fs.readFileSync(fontPath);
//     const customFont = await pdfDoc.embedFont(fontToUse);

//     // Overlay translations using our updated function.
//     overlayTranslations(pdfDoc, geminiResult, customFont);

//     // Save the modified PDF as bytes.
//     const pdfBytes = await pdfDoc.save();
//     const finalBuffer = Buffer.from(pdfBytes);

//     // Upload the modified PDF to Cloudinary.
//     const uploadedPdf = await uploadPdfToCloudinary(finalBuffer);
//     console.log("PDF uploaded to Cloudinary:", uploadedPdf.secure_url);
//     return res.status(200).json({ url_link: uploadedPdf.secure_url });
//   } catch (e) {
//     console.error("Error in PDF editing overlay:", e.message);
//     return res.status(500).json({ error: "PDF modification failed" });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import axios from "axios";
import cloudinary from "./services/cloudinary/cloudinary.js";
import upload from "./services/cloudinary/upload.js";
import { processAllPages } from "./controllers/geminiController.js";
import { fromBuffer } from "pdf2pic";
import sharp from "sharp";

// pdf-lib and fontkit
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import streamifier from "streamifier";

const app = express();
app.use(cors());
app.use(express.json());

/** Upload PDF buffer to Cloudinary */
const uploadPdfToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "manga_backend",
        public_id: `modified_${Date.now()}.pdf`,
        format: "pdf",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

/** Adjust bounding box from image to PDF coords */
const adjustCoordinates = (bb, pageW, pageH, imgW, imgH) => {
  const xScale = pageW / imgW;
  const yScale = pageH / imgH;
  const x = bb.x * xScale;
  const y = pageH - (bb.y + bb.height) * yScale;
  return {
    x,
    y,
    width: bb.width * xScale,
    height: bb.height * yScale,
  };
};

/** Enhance images via sharp */
const enhanceImagesForTextDetection = async (base64Images) =>
  Promise.all(
    base64Images.map(async (b64) => {
      const buf = Buffer.from(b64, "base64");
      const out = await sharp(buf)
        .modulate({ brightness: 1.1, contrast: 1.3 })
        .sharpen(0.5, 0.8, 0.5)
        .median(1)
        .toBuffer();
      return out.toString("base64");
    })
  );

/** Improved overlay that tags pages and dedups per-page */
const improvedOverlayTranslations = async (pdfDoc, geminiResult, customFont) => {
  const pages = pdfDoc.getPages();

  for (const entry of geminiResult) {
    const { page, translations, imageWidth, imageHeight } = entry;
    if (page < 1 || page > pages.length) continue;

    const pdfPage = pages[page - 1];
    const { width: pw, height: ph } = pdfPage.getSize();

    // reset per-page dedup set
    const seen = new Set();

    for (const { boundingBox, translatedText } of translations) {
      if (!translatedText?.trim()) continue;

      // compute PDF coords
      const box = adjustCoordinates(boundingBox, pw, ph, imageWidth, imageHeight);
      const sig = `${Math.round(box.x)}|${Math.round(box.y)}|${Math.round(box.width)}|${Math.round(box.height)}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      // text fitting
      const maxW = box.width - 10;
      const maxH = box.height - 10;
      let fontSize = Math.min(24, box.height / 2);
      fontSize = Math.max(fontSize, 6);

      // simple wrap/fit loop
      let lines;
      while (fontSize >= 6) {
        const lh = fontSize * 1.2;
        const words = translatedText.trim().split(/\s+/);
        lines = [];
        let line = words.shift();
        for (const w of words) {
          const test = `${line} ${w}`;
          if (customFont.widthOfTextAtSize(test, fontSize) <= maxW) {
            line = test;
          } else {
            lines.push(line);
            line = w;
          }
        }
        lines.push(line);
        if (lines.length * lh <= maxH) break;
        fontSize -= 1;
      }

      // center vertically
      const lineH = fontSize * 1.2,
            totalH = lines.length * lineH,
            startY = box.y + (box.height - totalH) / 2 + totalH;

      // draw each line with outline
      for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        const tw = customFont.widthOfTextAtSize(text, fontSize);
        const x = box.x + (box.width - tw) / 2;
        const y = startY - i * lineH;

        // white outline
        [
          [-1, -1], [0, -1], [1, -1],
          [-1,  0],         [1,  0],
          [-1,  1], [0,  1], [1,  1],
        ].forEach(([dx, dy]) => {
          pdfPage.drawText(text, {
            x: x + dx, y: y + dy,
            size: fontSize, font: customFont,
            color: rgb(1, 1, 1),
          });
        });

        // main text
        pdfPage.drawText(text, {
          x, y, size: fontSize, font: customFont, color: rgb(0, 0, 0),
        });
      }
    }
  }

  return pdfDoc;
};

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "No file" });

    // fetch PDF
    const { data } = await axios.get(req.file.path, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(data);

    // load for dimensions
    const tempDoc = await PDFDocument.load(pdfBuffer);
    const dims = tempDoc.getPages().map(p => {
      const { width, height } = p.getSize();
      const max = 1024;
      return width > height
        ? { width: max, height: Math.round((height/width)*max) }
        : { height: max, width:  Math.round((width/height)*max) };
    });

    // pdf2pic pages → buffers
    const converter = fromBuffer(pdfBuffer, {
      density: 300, format: "png",
      width: dims[0].width, height: dims[0].height,
      savePath: "./temp", saveFilename: "page"
    });
    const pagesData = await converter.bulk(-1);

    // read & cleanup
    const base64s = pagesData.map((p, i) => {
      const buf = fs.readFileSync(p.path);
      fs.unlinkSync(p.path);
      return buf.toString("base64");
    });

    // enhance then call Gemini
    const enhanced = await enhanceImagesForTextDetection(base64s);
    let geminiResult = await processAllPages(enhanced);

    // tag each page + attach dims
    geminiResult = geminiResult.map((pg, i) => ({
      page: i + 1,
      ...pg,
      imageWidth: dims[i].width,
      imageHeight: dims[i].height
    }));

    // Build new PDF & overlay
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const fontBytes = fs.readFileSync("./fonts/NotoSans-VariableFont_wdth,wght.ttf");
    const customFont = await pdfDoc.embedFont(fontBytes);

    // add image pages
    for (let i = 0; i < base64s.length; i++) {
      const img = Buffer.from(base64s[i], "base64");
      const png = await pdfDoc.embedPng(img);
      const page = pdfDoc.addPage([dims[i].width, dims[i].height]);
      page.drawImage(png, { x: 0, y: 0, width: dims[i].width, height: dims[i].height });
    }

    // overlay translations
    await improvedOverlayTranslations(pdfDoc, geminiResult, customFont);

    // save & upload
    const outBuf = await pdfDoc.save();
    const { secure_url } = await uploadPdfToCloudinary(Buffer.from(outBuf));
    console.log("link of the file " , secure_url)
    return res.json({ url_link: secure_url });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
