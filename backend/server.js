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
// server.js
import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import path from "path";
import axios from "axios";
import streamifier from "streamifier";
import cloudinary from "./services/cloudinary/cloudinary.js";
import upload from "./services/cloudinary/upload.js";
import sharp from "sharp";
import cv from "opencv4nodejs";
import { createWorker } from "tesseract.js";
import { fromBuffer } from "pdf2pic";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { translateWithGemini } from "./controllers/geminiController.js"; // a simple text→translation wrapper

const app = express();
app.use(cors());
app.use(express.json());

/** 1) Upload modified PDF to Cloudinary */
const uploadPdfToCloudinary = (buffer) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "manga_backend",
        public_id: `translated_${Date.now()}`,
        format: "pdf",
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });

/** 2) Convert PDF → high-res PNG pages */
async function pdfToImages(pdfBuffer) {
  const tmpDoc = await PDFDocument.load(pdfBuffer);
  const dims = tmpDoc.getPages().map(p => {
    const { width, height } = p.getSize();
    const max = 1024;
    if (width > height) return { width: max, height: Math.round((height/width)*max) };
    else             return { height: max, width:  Math.round((width/height)*max) };
  });

  const converter = fromBuffer(pdfBuffer, {
    density: 350,
    format: "png",
    width: dims[0].width,
    height: dims[0].height,
    savePath: "./temp",
    saveFilename: "page",
  });
  const pages = await converter.bulk(-1);

  return pages.map((p, i) => {
    const img = fs.readFileSync(p.path);
    fs.unlinkSync(p.path);
    return {
      page: i + 1,
      buffer: img,
      width: dims[i].width,
      height: dims[i].height
    };
  });
}

/** 3) Pre-process images with Sharp for better OCR */
async function enhanceImages(pages) {
  return Promise.all(pages.map(async pg => {
    const out = await sharp(pg.buffer)
      .modulate({ brightness: 1.1, contrast: 1.3 })
      .median(1)
      .toBuffer();
    return { ...pg, buffer: out };
  }));
}

/** 4) Detect speech-bubble contours with OpenCV */
function detectBubbleBoxes(buffer) {
  const mat = cv.imdecode(buffer).bgrToGray();
  const bin = mat.adaptiveThreshold(255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 15, 2);
  const kernel = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(25,25));
  const closed = bin.morphologyEx(kernel, cv.MORPH_CLOSE);
  const cnts = closed.findContours(cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
  const minArea = mat.rows * mat.cols * 0.0005;

  return cnts
    .map(c => c.boundingRect())
    .filter(b => b.width * b.height > minArea)
    .map(b => ({ x: b.x, y: b.y, width: b.width, height: b.height }));
}

/** 5) OCR each bubble region via Tesseract.js */
async function ocrBubbles(pageBuf, boxes) {
  const worker = createWorker();
  await worker.load();
  await worker.loadLanguage("eng");
  await worker.initialize("eng");

  const results = [];
  const pageMat = cv.imdecode(pageBuf);

  for (const box of boxes) {
    const roi = pageMat.getRegion(new cv.Rect(box.x, box.y, box.width, box.height));
    const png = cv.imencode(".png", roi);
    const { data:{ text } } = await worker.recognize(png);
    results.push({ boundingBox: box, text: text.trim() });
  }

  await worker.terminate();
  return results;
}

/** 6) Translate each bubble’s text via Gemini-flash */
async function translateBubbles(ocrResults) {
  return Promise.all(ocrResults.map(async ({ boundingBox, text }) => {
    const translated = await translateWithGemini(text);
    return { boundingBox, translatedText: translated };
  }));
}

/** 7) Overlay translations onto a new PDF */
async function overlayTranslations(pdfBuffer, pages, allTranslations) {
  const pdfDoc = await PDFDocument.load(pdfBuffer);
  pdfDoc.registerFontkit(fontkit);
  const fontBytes = fs.readFileSync("./fonts/NotoSans-VariableFont_wdth,wght.ttf");
  const customFont = await pdfDoc.embedFont(fontBytes);

  // create a fresh PDF with image backgrounds
  const outPdf = await PDFDocument.create();
  outPdf.registerFontkit(fontkit);
  const embeddedFont = await outPdf.embedFont(fontBytes);

// create a fresh PDF with image backgrounds
for (const pg of pages) {
  const page = outPdf.addPage([pg.width, pg.height]);
  // await here works
  const png = await outPdf.embedPng(pg.buffer);
  page.drawImage(png, {
    x: 0, y: 0,
    width: pg.width,
    height: pg.height
  });
}


  // draw each bubble’s translation
  const outPages = outPdf.getPages();
  for (const { page, translations } of allTranslations.reduce((map, pg) => {
    map[pg.page] ??= { page: pg.page, translations: [] };
    map[pg.page].translations.push(...pg.translations);
    return map;
  }, {})) {
    const pdfPage = outPages[page-1];
    const { width:PW, height:PH } = pdfPage.getSize();

    const seen = new Set();
    for (const { boundingBox, translatedText } of translations) {
      if (!translatedText) continue;
      // scale coords
      const xScale = PW / pages[page-1].width,
            yScale = PH / pages[page-1].height;
      const x = boundingBox.x * xScale,
            y = PH - (boundingBox.y + boundingBox.height)*yScale,
            w = boundingBox.width * xScale,
            h = boundingBox.height* yScale;
      const sig = `${x|0}-${y|0}-${w|0}-${h|0}`;
      if (seen.has(sig)) continue;
      seen.add(sig);

      // fit & wrap
      let fontSize = Math.min(20, h/2), lines;
      while (fontSize>=6) {
        const lh = fontSize*1.2, words=translatedText.split(/\s+/);
        lines=[], letLine=words.shift();
        for (const wWord of words) {
          const test = `${letLine} ${wWord}`;
          if (embeddedFont.widthOfTextAtSize(test,fontSize)<=w-8) letLine=test;
          else { lines.push(letLine); letLine=wWord; }
        }
        lines.push(letLine);
        if (lines.length*lh<=h-8) break;
        fontSize--;
      }

      // vertical centering
      const lh=fontSize*1.2, totalH=lines.length*lh;
      let startY = y + (h-totalH)/2 + totalH;

      // draw with stroke
      for (let i=0;i<lines.length;i++) {
        const txt = lines[i],
              tw=embeddedFont.widthOfTextAtSize(txt,fontSize),
              x0 = x + (w-tw)/2,
              y0 = startY - i*lh;

        // outline
        [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]]
          .forEach(([dx,dy])=> pdfPage.drawText(txt,{
            x:x0+dx,y:y0+dy,size:fontSize,font:embeddedFont,color:rgb(1,1,1)
          }));

        // fill
        pdfPage.drawText(txt,{x:x0,y:y0,size:fontSize,font:embeddedFont,color:rgb(0,0,0)});
      }
    }
  }

  return outPdf.save();
}

/** 8) Express route tying it all together */
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error:"Missing PDF" });

    // read pdf
    const { data } = await axios.get(req.file.path, { responseType:"arraybuffer" });
    const pdfBuf = Buffer.from(data);

    // 2→3: PDF→Images→Enhance
    let pages = await pdfToImages(pdfBuf);
    pages = await enhanceImages(pages);

    // 4→5→6: detect→OCR→translate
    const allTranslations = [];
    for (const pg of pages) {
      const boxes = detectBubbleBoxes(pg.buffer);
      const ocr = await ocrBubbles(pg.buffer, boxes);
      const translated = await translateBubbles(ocr);
      allTranslations.push({ page: pg.page, translations: translated });
    }

    // 7: overlay & upload
    const outPdfBuf = await overlayTranslations(pdfBuf, pages, allTranslations);
    const { secure_url } = await uploadPdfToCloudinary(outPdfBuf);

    res.json({ url_link: secure_url });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error:e.message });
  }
});

app.listen(process.env.PORT||5000,()=>console.log("Server running"));
