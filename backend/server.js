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



// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import path from "path";
// import fs from "fs";
// import axios from "axios";
// import cloudinary from "./services/cloudinary/cloudinary.js";
// import upload from "./services/cloudinary/upload.js";
// import { processAllPages } from "./controllers/geminiController.js";
// import { fromBuffer } from "pdf2pic";
// import sharp from "sharp";

// // pdf-lib and fontkit
// import { PDFDocument, rgb } from "pdf-lib";
// import fontkit from "@pdf-lib/fontkit";
// import streamifier from "streamifier";

// const app = express();
// app.use(cors());
// app.use(express.json());

// /** Upload PDF buffer to Cloudinary */
// const uploadPdfToCloudinary = (buffer) =>
//   new Promise((resolve, reject) => {
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

// /** Adjust bounding box from image to PDF coords */
// const adjustCoordinates = (bb, pageW, pageH, imgW, imgH) => {
//   const xScale = pageW / imgW;
//   const yScale = pageH / imgH;
//   const x = bb.x * xScale;
//   const y = pageH - (bb.y + bb.height) * yScale;
//   return {
//     x,
//     y,
//     width: bb.width * xScale,
//     height: bb.height * yScale,
//   };
// };

// /** Enhance images via sharp */
// const enhanceImagesForTextDetection = async (base64Images) =>
//   Promise.all(
//     base64Images.map(async (b64) => {
//       const buf = Buffer.from(b64, "base64");
//       const out = await sharp(buf)
//         .modulate({ brightness: 1.1, contrast: 1.3 })
//         .sharpen(0.5, 0.8, 0.5)
//         .median(1)
//         .toBuffer();
//       return out.toString("base64");
//     })
//   );

// /** Improved overlay that tags pages and dedups per-page */
// const improvedOverlayTranslations = async (pdfDoc, geminiResult, customFont) => {
//   const pages = pdfDoc.getPages();

//   for (const entry of geminiResult) {
//     const { page, translations, imageWidth, imageHeight } = entry;
//     if (page < 1 || page > pages.length) continue;

//     const pdfPage = pages[page - 1];
//     const { width: pw, height: ph } = pdfPage.getSize();

//     // reset per-page dedup set
//     const seen = new Set();

//     for (const { boundingBox, translatedText } of translations) {
//       if (!translatedText?.trim()) continue;

//       // compute PDF coords
//       const box = adjustCoordinates(boundingBox, pw, ph, imageWidth, imageHeight);
//       const sig = `${Math.round(box.x)}|${Math.round(box.y)}|${Math.round(box.width)}|${Math.round(box.height)}`;
//       if (seen.has(sig)) continue;
//       seen.add(sig);

//       // text fitting
//       const maxW = box.width - 10;
//       const maxH = box.height - 10;
//       let fontSize = Math.min(24, box.height / 2);
//       fontSize = Math.max(fontSize, 6);

//       // simple wrap/fit loop
//       let lines;
//       while (fontSize >= 6) {
//         const lh = fontSize * 1.2;
//         const words = translatedText.trim().split(/\s+/);
//         lines = [];
//         let line = words.shift();
//         for (const w of words) {
//           const test = `${line} ${w}`;
//           if (customFont.widthOfTextAtSize(test, fontSize) <= maxW) {
//             line = test;
//           } else {
//             lines.push(line);
//             line = w;
//           }
//         }
//         lines.push(line);
//         if (lines.length * lh <= maxH) break;
//         fontSize -= 1;
//       }

//       // center vertically
//       const lineH = fontSize * 1.2,
//             totalH = lines.length * lineH,
//             startY = box.y + (box.height - totalH) / 2 + totalH;

//       // draw each line with outline
//       for (let i = 0; i < lines.length; i++) {
//         const text = lines[i];
//         const tw = customFont.widthOfTextAtSize(text, fontSize);
//         const x = box.x + (box.width - tw) / 2;
//         const y = startY - i * lineH;

//         // white outline
//         [
//           [-1, -1], [0, -1], [1, -1],
//           [-1,  0],         [1,  0],
//           [-1,  1], [0,  1], [1,  1],
//         ].forEach(([dx, dy]) => {
//           pdfPage.drawText(text, {
//             x: x + dx, y: y + dy,
//             size: fontSize, font: customFont,
//             color: rgb(1, 1, 1),
//           });
//         });

//         // main text
//         pdfPage.drawText(text, {
//           x, y, size: fontSize, font: customFont, color: rgb(0, 0, 0),
//         });
//       }
//     }
//   }

//   return pdfDoc;
// };

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file?.path) return res.status(400).json({ error: "No file" });

//     // fetch PDF
//     const { data } = await axios.get(req.file.path, { responseType: "arraybuffer" });
//     const pdfBuffer = Buffer.from(data);

//     // load for dimensions
//     const tempDoc = await PDFDocument.load(pdfBuffer);
//     const dims = tempDoc.getPages().map(p => {
//       const { width, height } = p.getSize();
//       const max = 1024;
//       return width > height
//         ? { width: max, height: Math.round((height/width)*max) }
//         : { height: max, width:  Math.round((width/height)*max) };
//     });

//     // pdf2pic pages → buffers
//     const converter = fromBuffer(pdfBuffer, {
//       density: 300, format: "png",
//       width: dims[0].width, height: dims[0].height,
//       savePath: "./temp", saveFilename: "page"
//     });
//     const pagesData = await converter.bulk(-1);

//     // read & cleanup
//     const base64s = pagesData.map((p, i) => {
//       const buf = fs.readFileSync(p.path);
//       fs.unlinkSync(p.path);
//       return buf.toString("base64");
//     });

//     // enhance then call Gemini
//     const enhanced = await enhanceImagesForTextDetection(base64s);
//     let geminiResult = await processAllPages(enhanced);

//     // tag each page + attach dims
//     geminiResult = geminiResult.map((pg, i) => ({
//       page: i + 1,
//       ...pg,
//       imageWidth: dims[i].width,
//       imageHeight: dims[i].height
//     }));

//     // Build new PDF & overlay
//     const pdfDoc = await PDFDocument.create();
//     pdfDoc.registerFontkit(fontkit);
//     const fontBytes = fs.readFileSync("./fonts/NotoSans-VariableFont_wdth,wght.ttf");
//     const customFont = await pdfDoc.embedFont(fontBytes);

//     // add image pages
//     for (let i = 0; i < base64s.length; i++) {
//       const img = Buffer.from(base64s[i], "base64");
//       const png = await pdfDoc.embedPng(img);
//       const page = pdfDoc.addPage([dims[i].width, dims[i].height]);
//       page.drawImage(png, { x: 0, y: 0, width: dims[i].width, height: dims[i].height });
//     }

//     // overlay translations
//     await improvedOverlayTranslations(pdfDoc, geminiResult, customFont);

//     // save & upload
//     const outBuf = await pdfDoc.save();
//     const { secure_url } = await uploadPdfToCloudinary(Buffer.from(outBuf));
//     console.log("link of the file " , secure_url)
//     return res.json({ url_link: secure_url });

//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server on ${PORT}`));





// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import path from "path";
// import fs from "fs";
// import axios from "axios";
// import cloudinary from "./services/cloudinary/cloudinary.js";
// import upload from "./services/cloudinary/upload.js";
// import { processAllPages } from "./controllers/geminiController.js";
// import { fromBuffer } from "pdf2pic";
// import sharp from "sharp";

// // pdf-lib and fontkit
// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import fontkit from "@pdf-lib/fontkit";
// import streamifier from "streamifier";

// const app = express();
// app.use(cors());
// app.use(express.json());

// /** Upload PDF buffer to Cloudinary */
// const uploadPdfToCloudinary = (buffer) =>
//   new Promise((resolve, reject) => {
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

// /** Adjust bounding box from image to PDF coords */
// const adjustCoordinates = (bb, pageW, pageH, imgW, imgH) => {
//   const xScale = pageW / imgW;
//   const yScale = pageH / imgH;
//   const x = bb.x * xScale;
//   const y = pageH - (bb.y + bb.height) * yScale; // Y coordinates in PDF start from bottom
//   return {
//     x,
//     y,
//     width: bb.width * xScale,
//     height: bb.height * yScale,
//   };
// };

// /** Enhance images via sharp */
// const enhanceImagesForTextDetection = async (base64Images) =>
//   Promise.all(
//     base64Images.map(async (b64) => {
//       const buf = Buffer.from(b64, "base64");
//       const out = await sharp(buf)
//         .modulate({ brightness: 1.1, contrast: 1.3 })
//         .sharpen(0.5, 0.8, 0.5)
//         .median(1)
//         .toBuffer();
//       return out.toString("base64");
//     })
//   );

// /** Draw text with background for better readability */
// const drawTextWithBackground = (page, text, x, y, fontSize, font, options = {}) => {
//   const { 
//     bgColor = rgb(1, 1, 1), 
//     textColor = rgb(0, 0, 0),
//     padding = 2,
//     opacity = 0.7 
//   } = options;
  
//   const textWidth = font.widthOfTextAtSize(text, fontSize);
//   const textHeight = fontSize;
  
//   // Draw semi-transparent background
//   page.drawRectangle({
//     x: x - padding,
//     y: y - padding,
//     width: textWidth + (padding * 2),
//     height: textHeight + (padding * 2),
//     color: bgColor,
//     opacity: opacity
//   });
  
//   // Draw text
//   page.drawText(text, {
//     x,
//     y,
//     size: fontSize,
//     font,
//     color: textColor
//   });
// };

// /** Improved overlay that tags pages and dedups per-page */
// const improvedOverlayTranslations = async (pdfDoc, geminiResult) => {
//   try {
//     // Load the appropriate font
//     const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
//     // Try to embed a better CJK-compatible font
//     let primaryFont;
// // Try to embed Noto Sans or fallback to a standard PDF font
// try {
//   const fontPath = "./fonts/NotoSans-Regular.ttf";
//   if (fs.existsSync(fontPath)) {
//     const fontBytes = fs.readFileSync(fontPath);
//     primaryFont = await pdfDoc.embedFont(fontBytes);
//   } else {
//     // Use a standard PDF font as fallback
//     primaryFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
//   }
// } catch (err) {
//   console.warn("Error loading font:", err.message);
//   primaryFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
// }

//     const pages = pdfDoc.getPages();

//     for (const entry of geminiResult) {
//       const { page, translations, imageWidth, imageHeight } = entry;
//       if (!page || page < 1 || page > pages.length || !translations || !Array.isArray(translations)) {
//         console.warn(`Invalid page data for page ${page}`);
//         continue;
//       }

//       const pdfPage = pages[page - 1];
//       const { width: pw, height: ph } = pdfPage.getSize();

//       // reset per-page dedup set
//       const seen = new Set();

//       for (const translation of translations) {
//         // Skip invalid translations
//         if (!translation || !translation.boundingBox || !translation.translatedText) {
//           continue;
//         }
//         const { boundingBox, translatedText } = translation;
        
//         if (!translatedText?.trim()) continue;

//         // compute PDF coords
//         const box = adjustCoordinates(boundingBox, pw, ph, imageWidth, imageHeight);
//         const sig = `${Math.round(box.x)}|${Math.round(box.y)}|${Math.round(box.width)}|${Math.round(box.height)}`;
//         if (seen.has(sig)) continue;
//         seen.add(sig);

//         // Clean text - this helps with rendering special characters
//         const cleanedText = translatedText
//           .replace(/[\uFFFD\uFFFE\uFFFF]/g, '') // Remove Unicode replacement characters
//           .trim();

//         if (!cleanedText) continue;

//         // Text fitting with better sizing calculation
//         const paddingX = Math.max(4, box.width * 0.05);
//         const paddingY = Math.max(4, box.height * 0.05);
//         const maxW = box.width - (paddingX * 2);
//         const maxH = box.height - (paddingY * 2);
        
//         // Start with a reasonable font size based on box dimensions
//         let fontSize = Math.min(16, Math.max(8, Math.floor(box.height / 3)));
        
//         // Simple wrap/fit algorithm
//         let lines = [];
//         let optimalFontSize = fontSize;
        
//         // Find optimal font size
//         while (fontSize >= 7) {
//           const words = cleanedText.split(/\s+/);
//           lines = [];
//           let line = words[0] || '';
          
//           for (let i = 1; i < words.length; i++) {
//             const word = words[i];
//             const testLine = `${line} ${word}`;
//             const width = primaryFont.widthOfTextAtSize(testLine, fontSize);
            
//             if (width <= maxW) {
//               line = testLine;
//             } else {
//               lines.push(line);
//               line = word;
//             }
//           }
          
//           if (line) {
//             lines.push(line);
//           }
          
//           const lineHeight = fontSize * 1.2;
//           const totalHeight = lines.length * lineHeight;
          
//           if (totalHeight <= maxH) {
//             optimalFontSize = fontSize;
//             break;
//           }
          
//           fontSize -= 1;
//         }
        
//         // If we couldn't fit at minimum font size, try to squeeze more
//         if (fontSize < 7) {
//           // For very small text, simplify to fit
//           const compressedText = cleanedText.length > 30 
//             ? cleanedText.substring(0, 27) + '...' 
//             : cleanedText;
            
//           lines = [compressedText];
//           optimalFontSize = 7;
//         }
        
//         // Center text within bounding box
//         const lineHeight = optimalFontSize * 1.2;
//         const totalHeight = lines.length * lineHeight;
//         const startY = box.y + (box.height + totalHeight) / 2 - lineHeight;
        
//         // Draw each line
//         for (let i = 0; i < lines.length; i++) {
//           const line = lines[i];
//           const textWidth = primaryFont.widthOfTextAtSize(line, optimalFontSize);
//           const x = box.x + (box.width - textWidth) / 2;
//           const y = startY - (i * lineHeight);
          
//           // Draw text with background for better readability
//           drawTextWithBackground(
//             pdfPage, 
//             line, 
//             x, 
//             y, 
//             optimalFontSize, 
//             primaryFont, 
//             {
//               bgColor: rgb(1, 1, 1),
//               textColor: rgb(0, 0, 0),
//               padding: 3,
//               opacity: 0.8
//             }
//           );
//         }
//       }
//     }

//     return pdfDoc;
//   } catch (err) {
//     console.error("Error in overlay process:", err);
//     throw err;
//   }
// };

// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file?.path) return res.status(400).json({ error: "No file uploaded" });

//     // fetch PDF
//     const { data } = await axios.get(req.file.path, { responseType: "arraybuffer" });
//     const pdfBuffer = Buffer.from(data);

//     // load for dimensions
//     const tempDoc = await PDFDocument.load(pdfBuffer);
//     const dims = tempDoc.getPages().map(p => {
//       const { width, height } = p.getSize();
//       const max = 1024;
//       return width > height
//         ? { width: max, height: Math.round((height/width)*max) }
//         : { height: max, width:  Math.round((width/height)*max) };
//     });

//     // pdf2pic pages → buffers
//     const converter = fromBuffer(pdfBuffer, {
//       density: 300, 
//       format: "png",
//       width: dims[0].width, 
//       height: dims[0].height,
//       savePath: "./temp", 
//       saveFilename: "page"
//     });
    
//     console.log("Converting PDF pages to images...");
//     const pagesData = await converter.bulk(-1);
//     console.log(`Converted ${pagesData.length} pages`);

//     // read & cleanup
//     const base64s = pagesData.map((p, i) => {
//       const buf = fs.readFileSync(p.path);
//       fs.unlinkSync(p.path);
//       return buf.toString("base64");
//     });

//     // enhance then call Gemini
//     console.log("Enhancing images for better text detection...") ;
//     const enhanced = await enhanceImagesForTextDetection(base64s);
    
//     console.log("Processing with Gemini...");
//     let geminiResult = await processAllPages(enhanced);
//     console.log("Gemini processing complete");

//     // tag each page + attach dims
//     geminiResult = geminiResult.map((pg, i) => ({
//       page: i + 1,
//       ...pg,
//       imageWidth: dims[i].width,
//       imageHeight: dims[i].height
//     }));

//     // Build new PDF & overlay
//     console.log("Creating new PDF document");
//     const pdfDoc = await PDFDocument.create();
//     pdfDoc.registerFontkit(fontkit);

//     // add image pages
//     console.log("Adding pages to PDF");
//     for (let i = 0; i < base64s.length; i++) {
//       const img = Buffer.from(base64s[i], "base64");
//       const png = await pdfDoc.embedPng(img);
//       const page = pdfDoc.addPage([dims[i].width, dims[i].height]);
//       page.drawImage(png, { x: 0, y: 0, width: dims[i].width, height: dims[i].height });
//     }

//     // overlay translations
//     console.log("Overlaying translations");
//     await improvedOverlayTranslations(pdfDoc, geminiResult);

//     // save & upload
//     console.log("Saving PDF");
//     const outBuf = await pdfDoc.save();
    
//     console.log("Uploading to Cloudinary");
//     const { secure_url } = await uploadPdfToCloudinary(Buffer.from(outBuf));
//     console.log("File uploaded, link:", secure_url);
    
//     return res.json({ url_link: secure_url });

//   } catch (err) {
//     console.error("Error in upload process:", err);
//     return res.status(500).json({ error: err.message });
//   }
// });

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log(`Server running on port ${PORT}`));





//GOOGLE VISIO API



// SERVER CODE: app.js or index.js

// At the top of your server.js file
//code ,but a bit of overlap.

// import dotenv from 'dotenv';
// dotenv.config();

// import express from "express";
// import multer from "multer";
// import cors from "cors";
// import path from "path";
// import fs from "fs";
// import axios from "axios";
// import cloudinary from "./services/cloudinary/cloudinary.js";
// import upload from "./services/cloudinary/upload.js";
// import { fromBuffer } from "pdf2pic";
// import sharp from "sharp";
// import streamifier from "streamifier";

// // pdf-lib and fontkit
// import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// import fontkit from "@pdf-lib/fontkit";

// // Google Cloud services
// import { ImageAnnotatorClient } from "@google-cloud/vision";
// import { TranslationServiceClient } from "@google-cloud/translate";

// const app = express();
// app.use(cors());
// app.use(express.json());

// // Initialize Google Cloud clients
// const visionClient = new ImageAnnotatorClient({keyFileName:process.env.GOOGLE_APPLICATION_CREDENTIALS});
// const translationClient = new TranslationServiceClient({keyFileName:process.env.GOOGLE_APPLICATION_CREDENTIALS});

// const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
// const location = 'global';

// /** Upload PDF buffer to Cloudinary */
// const uploadPdfToCloudinary = (buffer) =>
//   new Promise((resolve, reject) => {
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

// /** Adjust bounding box from image to PDF coords */
// const adjustCoordinates = (bb, pageW, pageH, imgW, imgH) => {
//   const xScale = pageW / imgW;
//   const yScale = pageH / imgH;
//   const x = bb.x * xScale;
//   const y = pageH - (bb.y + bb.height) * yScale; // Y coordinates in PDF start from bottom
//   return {
//     x,
//     y,
//     width: bb.width * xScale,
//     height: bb.height * yScale,
//   };
// };

// /** Process a single image with Google Vision and translate the text */
// async function processImageWithVisionAndTranslate(base64Image, pageNumber) {
//   try {
//     // Detect text with Google Vision API
//     const [textDetectionResult] = await visionClient.textDetection({
//       image: { content: base64Image }
//     });
    
//     // If no text detected, return early
//     if (!textDetectionResult.textAnnotations || textDetectionResult.textAnnotations.length === 0) {
//       console.log(`No text detected on page ${pageNumber}`);
//       return { page: pageNumber, translations: [] };
//     }
    
//     // Extract full text detection (this gives us text blocks)
//     const fullTextAnnotation = textDetectionResult.fullTextAnnotation;
//     let textBlocks = [];
    
//     if (fullTextAnnotation && fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
//       // Use structured text output for better text blocks
//       const page = fullTextAnnotation.pages[0];
      
//       // Process blocks which are better grouped
//       for (const block of page.blocks || []) {
//         let blockText = "";
//         let boundingBox = null;
        
//         // Get vertices of the block
//         if (block.boundingBox && block.boundingBox.vertices) {
//           const vertices = block.boundingBox.vertices;
//           const xs = vertices.map(v => v.x || 0);
//           const ys = vertices.map(v => v.y || 0);
          
//           boundingBox = {
//             x: Math.min(...xs),
//             y: Math.min(...ys),
//             width: Math.max(...xs) - Math.min(...xs),
//             height: Math.max(...ys) - Math.min(...ys)
//           };
//         }
        
//         // Get text from paragraphs and words
//         for (const paragraph of block.paragraphs || []) {
//           for (const word of paragraph.words || []) {
//             let wordText = "";
//             for (const symbol of word.symbols || []) {
//               wordText += symbol.text || "";
//             }
//             blockText += wordText + " ";
//           }
//         }
        
//         if (blockText.trim() && boundingBox) {
//           textBlocks.push({
//             text: blockText.trim(),
//             boundingBox
//           });
//         }
//       }
//     } else {
//       // Fallback to basic annotations
//       const blockAnnotations = textDetectionResult.textAnnotations.slice(1);
      
//       for (const annotation of blockAnnotations) {
//         // Get bounding box coordinates from vertices
//         const vertices = annotation.boundingPoly.vertices;
//         const x = Math.min(...vertices.map(v => v.x || 0));
//         const y = Math.min(...vertices.map(v => v.y || 0));
//         const maxX = Math.max(...vertices.map(v => v.x || 0));
//         const maxY = Math.max(...vertices.map(v => v.y || 0));
        
//         textBlocks.push({
//           text: annotation.description,
//           boundingBox: {
//             x,
//             y,
//             width: maxX - x,
//             height: maxY - y
//           }
//         });
//       }
//     }
    
//     // No text blocks found
//     if (textBlocks.length === 0) {
//       return { page: pageNumber, translations: [] };
//     }
    
//     // IMPROVED: More intelligent merging of text blocks
//     const mergedBlocks = smartMergeTextBlocks(textBlocks);
    
//     // Translate all merged blocks
//     const textsToTranslate = mergedBlocks.map(block => block.text);
    
//     // Batch translate
//     const formattedParent = translationClient.locationPath(projectId, location);
//     const [translationResponse] = await translationClient.translateText({
//       parent: formattedParent,
//       contents: textsToTranslate,
//       mimeType: 'text/plain',
//       sourceLanguageCode: 'ja',
//       targetLanguageCode: 'en',
//     });
    
//     // Combine results
//     const translations = mergedBlocks.map((block, index) => {
//       return {
//         boundingBox: block.boundingBox,
//         originalText: block.text,
//         translatedText: translationResponse.translations[index].translatedText
//       };
//     });
    
//     return { page: pageNumber, translations };
//   } catch (error) {
//     console.error(`Error processing page ${pageNumber}:`, error);
//     return { page: pageNumber, translations: [] };
//   }
// }

// /**
//  * IMPROVED: Smart merging of text blocks based on proximity and alignment
//  * This function uses more sophisticated logic to determine which text blocks
//  * belong together in speech bubbles or text areas
//  */
// function smartMergeTextBlocks(textBlocks) {
//   // First, sort blocks by y-position (top to bottom)
//   textBlocks.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  
//   // Create clusters based on proximity
//   const clusters = [];
//   const processed = new Set();
  
//   for (let i = 0; i < textBlocks.length; i++) {
//     if (processed.has(i)) continue;
    
//     const current = textBlocks[i];
//     const cluster = [current];
//     processed.add(i);
    
//     // Find all blocks that are close to this one
//     // Using a more sophisticated proximity algorithm
//     for (let j = 0; j < textBlocks.length; j++) {
//       if (processed.has(j)) continue;
      
//       const other = textBlocks[j];
      
//       // Calculate distance and check if they're likely in the same speech bubble
//       if (areBlocksConnected(current, other)) {
//         cluster.push(other);
//         processed.add(j);
        
//         // Recursive check for other blocks connected to this one
//         let foundNew = true;
//         while (foundNew) {
//           foundNew = false;
//           for (let k = 0; k < textBlocks.length; k++) {
//             if (processed.has(k)) continue;
            
//             const nextBlock = textBlocks[k];
//             // Check if the block is connected to any block in the current cluster
//             for (const clusterBlock of cluster) {
//               if (areBlocksConnected(clusterBlock, nextBlock)) {
//                 cluster.push(nextBlock);
//                 processed.add(k);
//                 foundNew = true;
//                 break;
//               }
//             }
//           }
//         }
//       }
//     }
    
//     // Sort cluster by reading order (top to bottom, then left to right for Japanese)
//     cluster.sort((a, b) => {
//       // If they're roughly on the same line (within 50% of the average height)
//       const avgHeight = (a.boundingBox.height + b.boundingBox.height) / 2;
//       if (Math.abs(a.boundingBox.y - b.boundingBox.y) < avgHeight * 0.5) {
//         return a.boundingBox.x - b.boundingBox.x; // Left to right
//       }
//       return a.boundingBox.y - b.boundingBox.y; // Top to bottom
//     });
    
//     // Merge text in reading order
//     const mergedText = cluster.map(b => b.text).join(" ");
    
//     // Calculate bounding box that encompasses all blocks in cluster
//     const xs = cluster.map(b => b.boundingBox.x);
//     const ys = cluster.map(b => b.boundingBox.y);
//     const rights = cluster.map(b => b.boundingBox.x + b.boundingBox.width);
//     const bottoms = cluster.map(b => b.boundingBox.y + b.boundingBox.height);
    
//     // Create a bounding box with some padding for better display
//     const padding = 10; // Add padding around the merged bounding box
//     const mergedBoundingBox = {
//       x: Math.min(...xs) - padding,
//       y: Math.min(...ys) - padding,
//       width: Math.max(...rights) - Math.min(...xs) + (padding * 2),
//       height: Math.max(...bottoms) - Math.min(...ys) + (padding * 2)
//     };
    
//     clusters.push({
//       text: mergedText,
//       boundingBox: mergedBoundingBox,
//       blockCount: cluster.length
//     });
//   }
  
//   return clusters;
// }

// /**
//  * IMPROVED: Check if two text blocks are likely to be connected
//  * Takes into account both spatial proximity and reading flow
//  */
// function areBlocksConnected(blockA, blockB) {
//   const a = blockA.boundingBox;
//   const b = blockB.boundingBox;
  
//   // Calculate centers
//   const centerA = { x: a.x + a.width/2, y: a.y + a.height/2 };
//   const centerB = { x: b.x + b.width/2, y: b.y + b.height/2 };
  
//   // Calculate distances
//   const xDist = Math.abs(centerA.x - centerB.x);
//   const yDist = Math.abs(centerA.y - centerB.y);
  
//   // Calculate the average dimensions for scaling thresholds
//   const avgWidth = (a.width + b.width) / 2;
//   const avgHeight = (a.height + b.height) / 2;
  
//   // Check if blocks are horizontally aligned (on same line)
//   const horizontallyAligned = yDist < avgHeight * 0.8;
  
//   // Check if blocks are vertically aligned (one above the other)
//   const verticallyAligned = xDist < avgWidth * 0.8;
  
//   // Calculate overall proximity (diagonal distance relative to size)
//   const diagonalDist = Math.sqrt(xDist*xDist + yDist*yDist);
//   const proximityThreshold = Math.max(avgWidth, avgHeight) * 1.5;
  
//   // Two blocks are connected if they're either aligned or very close
//   return (horizontallyAligned && xDist < avgWidth * 3) || 
//          (verticallyAligned && yDist < avgHeight * 3) ||
//          diagonalDist < proximityThreshold;
// }

// /** Process all pages */
// async function processAllPages(base64Images) {
//   console.log(`Processing ${base64Images.length} pages...`);
  
//   const results = [];
//   // Process in smaller batches to avoid memory issues and rate limits
//   const batchSize = 2;
  
//   for (let i = 0; i < base64Images.length; i += batchSize) {
//     console.log(`Processing batch starting at page ${i+1}`);
//     const batch = base64Images.slice(i, i + batchSize);
//     const batchPromises = batch.map((base64, idx) => 
//       processImageWithVisionAndTranslate(base64, i + idx + 1)
//     );
    
//     try {
//       // Process batch in parallel
//       const batchResults = await Promise.all(batchPromises);
//       results.push(...batchResults);
//     } catch (error) {
//       console.error(`Error processing batch starting at page ${i+1}:`, error);
//     }
    
//     // Add a small delay between batches to avoid rate limits
//     if (i + batchSize < base64Images.length) {
//       await new Promise(resolve => setTimeout(resolve, 1000));
//     }
//   }
  
//   console.log(`Processed ${results.length} out of ${base64Images.length} pages`);
//   return results;
// }

// // Function to improve text detection by enhancing image quality
// const enhanceImagesForTextDetection = async (base64Images) =>
//   Promise.all(
//     base64Images.map(async (b64) => {
//       const buf = Buffer.from(b64, "base64");
      
//       // Enhanced image processing with improved parameters for manga text
//       const out = await sharp(buf)
//         .normalize() // Normalize the image to improve contrast
//         .modulate({ brightness: 1.15, contrast: 1.4 }) // Increase contrast more
//         .sharpen(1.0, 1.0, 0.8) // More aggressive sharpening
//         .median(1) // Keep median filter for noise reduction
//         .gamma(1.1) // Slight gamma adjustment to improve text visibility
//         .toBuffer();
        
//       return out.toString("base64");
//     })
//   );

// /**
//  * COMPLETELY REWRITTEN: Improved solution for preventing text overlaps
//  * Places translation text boxes to avoid overlaps and stay within page boundaries
//  * Uses a grid-based approach to find free space and optimize placement
//  */
// function optimizeTextBoxPositions(translations, pageWidth, pageHeight) {
//   if (!translations || translations.length === 0) return [];
  
//   // Create a grid to track occupied space
//   const gridCellSize = 20; // Size of each grid cell in PDF units
//   const gridWidth = Math.ceil(pageWidth / gridCellSize);
//   const gridHeight = Math.ceil(pageHeight / gridCellSize);
  
//   // Create an empty grid (0 = free, 1 = occupied)
//   const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
  
//   // Function to mark a rectangle as occupied in the grid
//   const markOccupied = (x, y, width, height) => {
//     const startCellX = Math.max(0, Math.floor(x / gridCellSize));
//     const startCellY = Math.max(0, Math.floor(y / gridCellSize));
//     const endCellX = Math.min(gridWidth - 1, Math.ceil((x + width) / gridCellSize));
//     const endCellY = Math.min(gridHeight - 1, Math.ceil((y + height) / gridCellSize));
    
//     for (let cy = startCellY; cy <= endCellY; cy++) {
//       for (let cx = startCellX; cx <= endCellX; cx++) {
//         grid[cy][cx] = 1;
//       }
//     }
//   };
  
//   // Function to check if a rectangle overlaps with occupied cells
//   const hasOverlap = (x, y, width, height) => {
//     const startCellX = Math.max(0, Math.floor(x / gridCellSize));
//     const startCellY = Math.max(0, Math.floor(y / gridCellSize));
//     const endCellX = Math.min(gridWidth - 1, Math.ceil((x + width) / gridCellSize));
//     const endCellY = Math.min(gridHeight - 1, Math.ceil((y + height) / gridCellSize));
    
//     for (let cy = startCellY; cy <= endCellY; cy++) {
//       for (let cx = startCellX; cx <= endCellX; cx++) {
//         if (grid[cy][cx] === 1) return true;
//       }
//     }
//     return false;
//   };
  
//   // Function to find nearest free space for a text box
//   const findFreeSpace = (origX, origY, boxWidth, boxHeight) => {
//     // Check original position first
//     if (!hasOverlap(origX, origY, boxWidth, boxHeight)) {
//       return { x: origX, y: origY };
//     }
    
//     // If original position has overlap, try concentric "rings" around it
//     for (let distance = gridCellSize; distance < Math.max(pageWidth, pageHeight); distance += gridCellSize) {
//       // Try positions in different directions from the original position
//       const directions = [
//         { dx: 0, dy: -distance }, // up
//         { dx: distance, dy: 0 },  // right
//         { dx: 0, dy: distance },  // down
//         { dx: -distance, dy: 0 }, // left
//         { dx: distance, dy: -distance }, // up-right
//         { dx: distance, dy: distance },  // down-right
//         { dx: -distance, dy: distance }, // down-left
//         { dx: -distance, dy: -distance } // up-left
//       ];
      
//       for (const { dx, dy } of directions) {
//         const newX = Math.max(0, Math.min(pageWidth - boxWidth, origX + dx));
//         const newY = Math.max(0, Math.min(pageHeight - boxHeight, origY + dy));
        
//         if (!hasOverlap(newX, newY, boxWidth, boxHeight)) {
//           return { x: newX, y: newY };
//         }
//       }
//     }
    
//     // If all else fails, return original position (should rarely happen)
//     return { x: origX, y: origY };
//   };
  
//   // Sort translations by area (larger texts first)
//   const sortedTranslations = [...translations].sort((a, b) => {
//     const areaA = a.boundingBox.width * a.boundingBox.height;
//     const areaB = b.boundingBox.width * b.boundingBox.height;
//     return areaB - areaA; // Larger areas first
//   });
  
//   // Process each translation to find optimal positions
//   const optimizedTranslations = [];
  
//   for (const translation of sortedTranslations) {
//     const { boundingBox, translatedText, originalTexts } = translation;
    
//     if (!translatedText || translatedText.trim() === '') continue;
    
//     // Ensure box is within page boundaries
//     let { x, y, width, height } = boundingBox;
//     x = Math.max(0, Math.min(x, pageWidth - width));
//     y = Math.max(0, Math.min(y, pageHeight - height));
    
//     // IMPORTANT IMPROVEMENT: Calculate how much space we actually need
//     // based on text length
//     const textLength = translatedText.length;
//     const estimatedLines = Math.ceil(textLength / 20); // Rough estimate: ~20 chars per line
//     const estimatedHeight = Math.max(height, estimatedLines * 15 + 10); // ~15pt per line + padding
//     const estimatedWidth = Math.max(width, Math.min(300, 150 + textLength * 2)); // Scale width by text length
    
//     // Find optimal position
//     const { x: optX, y: optY } = findFreeSpace(x, y, estimatedWidth, estimatedHeight);
    
//     // Mark this position as occupied in our grid
//     markOccupied(optX, optY, estimatedWidth, estimatedHeight);
    
//     // Create optimized translation with new position
//     optimizedTranslations.push({
//       boundingBox: {
//         x: optX,
//         y: optY,
//         width: estimatedWidth,
//         height: estimatedHeight
//       },
//       translatedText,
//       originalTexts
//     });
//   }
  
//   return optimizedTranslations;
// }

// // Enhanced text layout function with better line breaking
// const layoutText = (text, font, fontSize, maxWidth) => {
//   // Remove excessive whitespace
//   text = text.trim().replace(/\s+/g, ' ');
  
//   const words = text.split(/\s+/);
//   const lines = [];
//   let currentLine = words[0] || '';
  
//   for (let i = 1; i < words.length; i++) {
//     const word = words[i];
//     const testLine = `${currentLine} ${word}`;
//     const width = font.widthOfTextAtSize(testLine, fontSize);
    
//     if (width <= maxWidth) {
//       currentLine = testLine;
//     } else {
//       // Check if the word itself is too long and needs hyphenation
//       const wordWidth = font.widthOfTextAtSize(word, fontSize);
//       if (wordWidth > maxWidth && word.length > 8) {
//         // Add current line if not empty
//         if (currentLine) {
//           lines.push(currentLine);
//         }
        
//         // Hyphenate long word
//         let part = '';
//         for (let j = 0; j < word.length; j++) {
//           const testPart = part + word[j];
//           const testWidth = font.widthOfTextAtSize(testPart, fontSize);
          
//           if (testWidth <= maxWidth) {
//             part = testPart;
//           } else {
//             if (j > 0) {
//               lines.push(part + '-');
//               part = word[j];
//             } else {
//               // Even a single character is too wide, just add it anyway
//               lines.push(word.substring(0, j + 1));
//               part = '';
//             }
//           }
//         }
        
//         // Add any remaining part
//         if (part) {
//           currentLine = part;
//         } else {
//           currentLine = '';
//         }
//       } else {
//         lines.push(currentLine);
//         currentLine = word;
//       }
//     }
//   }
  
//   if (currentLine) {
//     lines.push(currentLine);
//   }
  
//   return lines;
// };

// // Optimized font size calculation based on text and box size
// const calculateOptimalFontSize = (text, boxWidth, boxHeight, font, maxFontSize = 12) => {
//   // Start with maximum size
//   let fontSize = maxFontSize;
  
//   // Check how many characters we have - adjust starting font size for longer text
//   if (text.length > 50) {
//     fontSize = Math.min(fontSize, 10);
//   }
//   if (text.length > 100) {
//     fontSize = Math.min(fontSize, 9);
//   }
  
//   // Reduce font size until text fits width and height limitations
//   while (fontSize > 7) { // 7 is minimum readable size
//     const lines = layoutText(text, font, fontSize, boxWidth - 10); // account for padding
//     const estimatedHeight = lines.length * fontSize * 1.3; // increased line height factor for readability
    
//     // If it fits, we're good
//     if (estimatedHeight <= boxHeight - 10) {
//       break;
//     }
    
//     // Reduce font size and try again
//     fontSize -= 0.5;
//   }
  
//   return fontSize;
// };

// /**
//  * IMPROVED: Draw a stylish text box with better readability
//  * Features rounded corners, better contrast, and more professional styling
//  */
// const drawStylishTextBox = (page, textLines, x, y, fontSize, font, options = {}) => {
//   const { 
//     bgColor = rgb(1, 1, 1),     // White background
//     textColor = rgb(0, 0, 0),   // Black text
//     borderColor = rgb(0, 0, 0), // Black border
//     borderWidth = 1,
//     padding = 6,
//     opacity = 0.9,
//   } = options;
  
//   // Calculate text dimensions
//   const lineHeight = fontSize * 1.3;
//   const boxHeight = textLines.length * lineHeight + (padding * 2);
  
//   // Find the longest line to determine width
//   let maxWidth = 0;
//   for (const line of textLines) {
//     const lineWidth = font.widthOfTextAtSize(line, fontSize);
//     maxWidth = Math.max(maxWidth, lineWidth);
//   }
//   const boxWidth = maxWidth + (padding * 2);
  
//   // Draw outer border (simulating rounded corners)
//   page.drawRectangle({
//     x: x - padding - borderWidth,
//     y: y - boxHeight + padding + lineHeight,
//     width: boxWidth + (borderWidth * 2),
//     height: boxHeight,
//     color: borderColor,
//     opacity: opacity + 0.05 // Slightly more opaque border
//   });
  
//   // Draw background
//   page.drawRectangle({
//     x: x - padding,
//     y: y - boxHeight + padding + lineHeight,
//     width: boxWidth,
//     height: boxHeight - borderWidth * 2,
//     color: bgColor,
//     opacity: opacity
//   });
  
//   // Draw each line of text
//   for (let i = 0; i < textLines.length; i++) {
//     const line = textLines[i];
//     const textY = y - i * lineHeight;
    
//     page.drawText(line, {
//       x,
//       y: textY,
//       size: fontSize,
//       font,
//       color: textColor
//     });
//   }
// };

// /**
//  * COMPLETELY REWRITTEN: Enhanced overlay function to apply text on PDF pages
//  * Includes better text styling, improved positioning, and overlap prevention
//  */
// const overlayTranslations = async (pdfDoc, visionResults) => {
//   try {
//     // Load fonts
//     const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
//     // Try to embed a better font if available
//     let primaryFont;
//     try {
//       const fontPath = "./fonts/NotoSans-Regular.ttf";
//       if (fs.existsSync(fontPath)) {
//         const fontBytes = fs.readFileSync(fontPath);
//         primaryFont = await pdfDoc.embedFont(fontBytes);
//       } else {
//         primaryFont = fallbackFont;
//       }
//     } catch (err) {
//       console.warn("Error loading font:", err.message);
//       primaryFont = fallbackFont;
//     }

//     const pages = pdfDoc.getPages();
    
//     // Process each page
//     for (let pageNum = 1; pageNum <= pages.length; pageNum++) {
//       const pageEntries = visionResults.filter(entry => entry.page === pageNum);
//       if (!pageEntries.length) continue;
      
//       const pdfPage = pages[pageNum - 1];
//       const { width: pw, height: ph } = pdfPage.getSize();
      
//       // Get all translations for this page
//       let translations = [];
//       pageEntries.forEach(entry => {
//         if (entry.translations && Array.isArray(entry.translations)) {
//           translations = translations.concat(entry.translations.map(t => ({
//             ...t,
//             boundingBox: adjustCoordinates(
//               t.boundingBox, 
//               pw, 
//               ph, 
//               entry.imageWidth || pw, 
//               entry.imageHeight || ph
//             ),
//             imageWidth: entry.imageWidth,
//             imageHeight: entry.imageHeight
//           })));
//         }
//       });
      
//       // Skip page if no translations
//       if (!translations.length) continue;
      
//       // Find optimal positions to avoid overlaps
//       const optimizedTranslations = optimizeTextBoxPositions(translations, pw, ph);
      
//       // Now overlay the optimized translations
//       for (const translation of optimizedTranslations) {
//         const { boundingBox, translatedText } = translation;
        
//         if (!translatedText?.trim()) continue;
        
//         const cleanedText = translatedText
//           .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
//           .trim();
        
//         if (!cleanedText) continue;
        
//         // Calculate optimal font size for text
//         const fontSize = calculateOptimalFontSize(
//           cleanedText, 
//           boundingBox.width - 12, // Additional padding for better readability
//           boundingBox.height,
//           primaryFont, 
//           12 // Maximum font size
//         );
        
//         // Lay out text into multiple lines
//         const lines = layoutText(cleanedText, primaryFont, fontSize, boundingBox.width - 12);
        
//         // Draw the text box with improved styling
//         drawStylishTextBox(
//           pdfPage,
//           lines,
//           boundingBox.x + 6, // Add padding for better text placement
//           boundingBox.y + boundingBox.height - 6, // Position from top of box
//           fontSize,
//           primaryFont,
//           {
//             bgColor: rgb(1, 1, 1),       // White background
//             textColor: rgb(0, 0, 0),     // Black text
//             borderColor: rgb(0.1, 0.1, 0.1), // Slightly lighter border
//             borderWidth: 1.5,            // Thicker border
//             padding: 6,                  // Good padding
//             opacity: 0.92                // More opaque for better readability
//           }
//         );
//       }
//     }

//     return pdfDoc;
//   } catch (err) {
//     console.error("Error in overlay process:", err);
//     throw err;
//   }
// };
// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     if (!req.file?.path) return res.status(400).json({ error: "No file uploaded" });

//     // fetch PDF
//     const { data } = await axios.get(req.file.path, { responseType: "arraybuffer" });
//     const pdfBuffer = Buffer.from(data);

//     // load for dimensions
//     const tempDoc = await PDFDocument.load(pdfBuffer);
//     const dims = tempDoc.getPages().map(p => {
//       const { width, height } = p.getSize();
//       const max = 1024;
//       return width > height
//         ? { width: max, height: Math.round((height/width) * max) }
//         : { width: Math.round((width/height) * max), height: max };
//     });

//     console.log(`PDF has ${tempDoc.getPageCount()} pages.`);

//     // Convert PDF pages to images for OCR processing
//     console.log("Converting PDF pages to images...");
//     const base64Images = [];
//     const baseOptions = {
//       density: 300,
//       quality: 100,
//       format: "png",
//       width: 0,
//       height: 0,
//     };

//     // Process each page and convert to image
//     for (let i = 0; i < tempDoc.getPageCount(); i++) {
//       try {
//         const options = {
//           ...baseOptions,
//           width: dims[i].width,
//           height: dims[i].height,
//         };
        
//         const pageNum = i + 1;
//         const convert = fromBuffer(pdfBuffer, options);
//         const pageOutput = await convert(pageNum, { responseType: "base64" });
        
//         base64Images.push(pageOutput.base64);
//         console.log(`Converted page ${pageNum}/${tempDoc.getPageCount()}`);
//       } catch (error) {
//         console.error(`Error converting page ${i + 1}:`, error);
//       }
//     }

//     if (base64Images.length === 0) {
//       return res.status(500).json({ error: "Failed to convert PDF pages to images" });
//     }

//     // Enhance images for better text detection
//     console.log("Enhancing images for text detection...");
//     const enhancedImages = await enhanceImagesForTextDetection(base64Images);

//     // Process all pages with Google Vision API and translate
//     console.log("Processing images with Google Vision & Translation...");
//     const visionResults = await processAllPages(enhancedImages);

//     // Create a new PDF with translations
//     console.log("Creating new PDF with translations...");
//     const pdfDoc = await PDFDocument.load(pdfBuffer);
//     pdfDoc.registerFontkit(fontkit);

//     // Add translations to the PDF
//     const finalPdf = await overlayTranslations(pdfDoc, visionResults.map((result, idx) => ({
//       ...result,
//       imageWidth: dims[idx].width,
//       imageHeight: dims[idx].height
//     })));

//     // Save modified PDF
//     const modifiedPdfBytes = await finalPdf.save();
    
//     // Upload the modified PDF to Cloudinary
//     console.log("Uploading modified PDF to Cloudinary...");
//     const uploadResult = await uploadPdfToCloudinary(modifiedPdfBytes);
//     console.log("file uploaded at ", uploadResult.secure_url)

//     // Return success response with the URL of the modified PDF
//     return res.status(200).json({
//       message: "PDF processed successfully",
//       original: req.file.path,
//       translated: uploadResult.secure_url,
//       pages: tempDoc.getPageCount(),
//       processed: visionResults.length,
//       translations: visionResults.reduce((acc, page) => acc + page.translations.length, 0)
//     });
//   } catch (error) {
//     console.error("Error processing PDF:", error);
//     return res.status(500).json({ 
//       error: "Error processing PDF", 
//       message: error.message 
//     });
//   }
// });

// const PORT = process.env.PORT||5000;
// app.listen(PORT , () => console.log(`server running at port ${PORT}`));




//=============upar wala badhiya hai many pdf's 

//code ,but a bit of overlap.

import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import multer from "multer";
import cors from "cors";
import path from "path";
import fs from "fs";
import axios from "axios";
import cloudinary from "./services/cloudinary/cloudinary.js";
import upload from "./services/cloudinary/upload.js";
import { fromBuffer } from "pdf2pic";
import streamifier from "streamifier";
import { fileURLToPath } from 'url';
import sharp from 'sharp';

// pdf-lib and fontkit
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Google Cloud services
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { TranslationServiceClient } from "@google-cloud/translate";

// Define __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Google Cloud clients

// Construct the credentials object using process.env
const credentials = {
  type: process.env.type,
  project_id: process.env.project_id,
  private_key_id: process.env.private_key_id,
  private_key: process.env.private_key, 
  client_email: process.env.client_email,
  client_id: process.env.client_id,
  auth_uri: process.env.auth_uri,
  token_uri: process.env.token_uri,
  auth_provider_x509_cert_url: process.env.auth_provider_x509_cert_url,
  client_x509_cert_url: process.env.client_x509_cert_url,
  universe_domain:process.env.universe_domain
};
const visionClient = new ImageAnnotatorClient({credentials });
const translationClient = new TranslationServiceClient({credentials });

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const location = 'global';

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

/** Post-process translations for natural manga dialogue */
const postProcessTranslation = (text, type) => {
  // General adjustments for casual dialogue
  text = text.replace(/you can just/g, "you can");
  text = text.replace(/do you not think/g, "don't you think");
  text = text.replace(/it is not/g, "it's not");
  text = text.replace(/no matter how you look at it/g, "no way");
  text = text.replace(/I have/g, "I've");
  text = text.replace(/photograph/g, "shoot");

  // Fix grammatical errors
  text = text.replace(/I'ven't/g, "I haven't");

  // Add emotional tone typical of manga
  if (text.endsWith("!")) {
    text = text.replace(/it's not/i, "it ain't");
    text = text.replace(/you can/i, "you can't just");
  }

  // Fix specific mistranslations
  text = text.replace(/hono/i, "Honoka");
  text = text.replace(/Honokaka/g, "Honoka");
  text = text.replace(/Honodol/i, "Honokadol");
  text = text.replace(/Lilihowa/i, "Lilihowa");
  text = text.replace(/Nozami/g, "Nozomi");
  text = text.replace(/Rarely/i, "Nozomi");

  // Add casual contractions
  text = text.replace(/I am/g, "I'm");
  text = text.replace(/you are/g, "you're");
  text = text.replace(/we are/g, "we're");

  // Context-specific adjustments
  if (type === 'speechBubble' || type === 'narration') {
    text = text.replace(/artificial respiration/i, "CPR");
    text = text.replace(/was drowning/i, "was drowning");
    text = text.replace(/to anything, do you\?/i, "on everything, right?");
    text = text.replace(/this is totally/i, "this is totally");
    text = text.replace(/The camera is well known for its sexy images/i, "The crew, led by Nozomi, is known for its sexy shots");
  }

  if (type === 'soundEffect') {
    if (text.match(/^(Pera|Puka|Pupu)$/i)) {
      text = text + "...";
    }
  }

  // Replace special characters that might not be supported by some fonts
  text = text.replace(/\u2161/g, "II"); // Replace Roman numeral Ⅱ with II
  text = text.replace(/\u2026/g, "..."); // Replace ellipsis … with ...
  text = text.replace(/\u266A/g, "*"); // Replace musical note ♪ with *
  text = text.replace(/\u2605/g, "*"); // Replace star ★ with *

  return text;
};

/** Process a single image with Google Vision and translate the text */

async function processImageWithVisionAndTranslate(base64Image, pageNumber, pageWidth, pageHeight) {
  try {
    const [textDetectionResult] = await visionClient.textDetection({
      image: { content: base64Image }
    });

    if (!textDetectionResult.textAnnotations || textDetectionResult.textAnnotations.length === 0) {
      console.log(`No text detected on page ${pageNumber}`);
      return { page: pageNumber, translations: [] };
    }

    const fullTextAnnotation = textDetectionResult.fullTextAnnotation;
    let textBlocks = [];

    if (fullTextAnnotation && fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
      const page = fullTextAnnotation.pages[0];
      for (const block of page.blocks || []) {
        let blockText = "";
        let boundingBox = null;

        if (block.boundingBox && block.boundingBox.vertices) {
          const vertices = block.boundingBox.vertices;
          const xs = vertices.map(v => v.x || 0);
          const ys = vertices.map(v => v.y || 0);

          boundingBox = {   //har block ka bounding box stored in this obj
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
          };
        }

        for (const paragraph of block.paragraphs || []) {
          for (const word of paragraph.words || []) {
            let wordText = "";
            for (const symbol of word.symbols || []) {
              wordText += symbol.text || "";
            }
            blockText += wordText + " ";
          }
        }

        if (blockText.trim() && boundingBox) {
          textBlocks.push({
            text: blockText.trim(),
            boundingBox  //we created above
          });
        }
      }
    } else {
      const blockAnnotations = textDetectionResult.textAnnotations.slice(1);
      for (const annotation of blockAnnotations) {
        const vertices = annotation.boundingPoly.vertices;
        const x = Math.min(...vertices.map(v => v.x || 0));
        const y = Math.min(...vertices.map(v => v.y || 0));
        const maxX = Math.max(...vertices.map(v => v.x || 0));
        const maxY = Math.max(...vertices.map(v => v.y || 0));

        textBlocks.push({
          text: annotation.description,
          boundingBox: {
            x,
            y,
            width: maxX - x,
            height: maxY - y
          }
        });
      }
    }

    if (textBlocks.length === 0) {
      console.log(`No text blocks found on page ${pageNumber}`);
      return { page: pageNumber, translations: [] };
    }

    console.log(`Detected ${textBlocks.length} text blocks on page ${pageNumber}:`);
    textBlocks.forEach((block, index) => {
      console.log(`Block ${index + 1}: Text="${block.text}", BoundingBox=${JSON.stringify(block.boundingBox)}`);
    });

    const classifiedBlocks = textBlocks.map(block => {
      const type = classifyTextBlock(block.boundingBox, pageWidth, pageHeight, block.text);
      return { ...block, type };  //just adds the type of the text -> title , dialogue etc..... with previously containing stuffs inside of textBlocks like text and bounding box
    }).filter(block => {
      if (block.text.match(/^\d+$/) && block.boundingBox.width < 50 && block.boundingBox.height < 50) {
        console.log(`Filtered out block: Text="${block.text}" (likely artwork)`);
        return false;
      }
      return true;
    });

    classifiedBlocks.forEach((block, index) => {
      console.log(`Block ${index + 1}: Classified as "${block.type}", Text="${block.text}"`);
    });

    let blocksToTranslate = classifiedBlocks;  //classified blocks -> arr of objects ,each obj -> { text , bounding box , type}

    if (blocksToTranslate.length === 0) {
      console.log(`No blocks to translate on page ${pageNumber}`);
      return { page: pageNumber, translations: [] };
    }

    // Sort blocks by position (top-to-bottom, left-to-right)
    blocksToTranslate.sort((a, b) => {
      if (Math.abs(a.boundingBox.y - b.boundingBox.y) < Math.min(a.boundingBox.height, b.boundingBox.height) * 0.5) {
        return a.boundingBox.x - b.boundingBox.x;
      }
      return a.boundingBox.y - b.boundingBox.y;
    });

    // Simplified clustering logic with a single pass
    const getDistance = (b1, b2) => {
      const box1 = b1.boundingBox;
      const box2 = b2.boundingBox;
    
      const x1 = box1.x;
      const x2 = box2.x;
      const w1 = box1.width;
      const w2 = box2.width;
    
      const y1 = box1.y;
      const y2 = box2.y;
      const h1 = box1.height;
      const h2 = box2.height;
    
      const xGap =
        x1 + w1 < x2 ? x2 - (x1 + w1) :
        x2 + w2 < x1 ? x1 - (x2 + w2) :
        0;
    
      const yGap =
        y1 + h1 < y2 ? y2 - (y1 + h1) :
        y2 + h2 < y1 ? y1 - (y2 + h2) :
        0;
    
      const overlapX = x1 < x2 + w2 && x2 < x1 + w1;
      const overlapY = y1 < y2 + h2 && y2 < y1 + h1;
    
      return { xGap, yGap, overlapX, overlapY };
    };
    

    const avgWidth = blocksToTranslate.reduce((sum, b) => sum + b.boundingBox.width, 0) / blocksToTranslate.length;
    const avgHeight = blocksToTranslate.reduce((sum, b) => sum + b.boundingBox.height, 0) / blocksToTranslate.length;
    const proximityThreshold = Math.min(Math.max(avgWidth, avgHeight) * 0.5, 50);
    console.log(`Proximity threshold on page ${pageNumber}: ${proximityThreshold}`);

    let clusters = blocksToTranslate.map((block, index) => [index]);

    // Single-pass clustering
    let changed = true;
    while (changed) {
      changed = false;
      const newClusters = [];
      const clusterVisited = new Set();

      for (let i = 0; i < clusters.length; i++) {
        if (clusterVisited.has(i)) continue;
        let cluster = clusters[i];
        clusterVisited.add(i);

        for (let j = 0; j < clusters.length; j++) {
          if (i === j || clusterVisited.has(j)) continue;

          const otherCluster = clusters[j];
          let shouldMerge = false;

          for (const idx1 of cluster) {
            for (const idx2 of otherCluster) {
              const block1 = blocksToTranslate[idx1];
              const block2 = blocksToTranslate[idx2];
              const { xGap, yGap, overlapX, overlapY } = getDistance(block1, block2);

              const isCloseHorizontally = xGap <= proximityThreshold || overlapX;
              const isCloseVertically = yGap <= proximityThreshold || overlapY;
              const isNearlySameLine = yGap <= 10;

              if ((isCloseHorizontally && (isCloseVertically || isNearlySameLine)) && block1.type === block2.type) {
                shouldMerge = true;
                console.log(`Merging blocks on page ${pageNumber}: "${block1.text}" and "${block2.text}" (xGap: ${xGap}, yGap: ${yGap}, overlapX: ${overlapX}, overlapY: ${overlapY})`);
                break;
              }
            }
            if (shouldMerge) break;
          }

          if (shouldMerge) {
            cluster = [...cluster, ...otherCluster];
            clusterVisited.add(j);
            changed = true;
          }
        }

        newClusters.push(cluster);
      }

      clusters = newClusters;
    }

    // Merge blocks within clusters
    const mergedBlocks = clusters.map(cluster => {
      const group = cluster.map(index => blocksToTranslate[index]);

      group.sort((a, b) => {
        if (Math.abs(a.boundingBox.y - b.boundingBox.y) < Math.min(a.boundingBox.height, b.boundingBox.height) * 0.5) {
          return a.boundingBox.x - b.boundingBox.x;
        }
        return a.boundingBox.y - b.boundingBox.y;
      });

      const mergedText = group.map(b => b.text).join(" ");
      const type = group[0].type;

      const xs = group.map(b => b.boundingBox.x);
      const ys = group.map(b => b.boundingBox.y);
      const rights = group.map(b => b.boundingBox.x + b.boundingBox.width);
      const bottoms = group.map(b => b.boundingBox.y + b.boundingBox.height);

      const mergedBox = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...rights) - Math.min(...xs),
        height: Math.max(...bottoms) - Math.min(...ys),
        originalBlocks: group
      };

      const avgBlockArea = (avgWidth * avgHeight);
      const mergedArea = mergedBox.width * mergedBox.height;
      if (mergedArea > avgBlockArea * 8 && group.length > 1) {
        console.log(`Cluster on page ${pageNumber} rejected due to excessive size:`, mergedBox);
        return group.map(b => ({
          text: b.text,
          boundingBox: b.boundingBox,
          type: b.type
        }));
      }

      return [{
        text: mergedText,
        boundingBox: mergedBox,
        type
      }];
    }).flat();

    const textsToTranslate = mergedBlocks.map(block => block.text);

    if (textsToTranslate.length === 0) {
      console.log(`No texts to translate on page ${pageNumber}`);
      return { page: pageNumber, translations: [] };
    }

    console.log(`Translating ${textsToTranslate.length} text blocks on page ${pageNumber}:`, textsToTranslate);

    const formattedParent = translationClient.locationPath(projectId, location);
    const [translationResponse] = await translationClient.translateText({
      parent: formattedParent,
      contents: textsToTranslate,
      mimeType: 'text/plain',
      sourceLanguageCode: 'ja',
      targetLanguageCode: 'en'
    });

    const translations = mergedBlocks.map((block, index) => {
      let translatedText = translationResponse.translations[index].translatedText;
      const postProcessedText = postProcessTranslation(translatedText, block.type);
      console.log(`Translation for block ${index + 1} on page ${pageNumber}: "${block.text}" -> "${translatedText}" -> Post-processed: "${postProcessedText}"`);
      return {
        boundingBox: block.boundingBox,
        originalText: block.text,
        translatedText: postProcessedText,
        type: block.type
      };
    });

    return { page: pageNumber, translations };
  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    return { page: pageNumber, translations: [], error: error.message };
  }
}

/** Process all pages */
async function processAllPages(base64Images, pageDims) {
  console.log(`Processing ${base64Images.length} pages...`);

  const results = [];
  const batchSize = 2;

  for (let i = 0; i < base64Images.length; i += batchSize) {
    console.log(`Processing batch starting at page ${i+1}`);
    const batch = base64Images.slice(i, i + batchSize);
    const batchPromises = batch.map((base64, idx) =>
      processImageWithVisionAndTranslate(base64, i + idx + 1, pageDims[i + idx].width, pageDims[i + idx].height)
    );   //format of response from processImageWith..functionn-> object{ page: pageNumber, translations: [] }

    try {
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error processing batch starting at page ${i + 1}:`, error);
      results.push(...batch.map((_, idx) => ({
        page: i + idx + 1,
        translations: [],
        error: error.message
      })));
    }

    if (i + batchSize < base64Images.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`Processed ${results.length} out of ${base64Images.length} pages`);
  return results;
}

/** Enhance images for better text detection */
const enhanceImagesForTextDetection = async (base64Images) =>
  Promise.all(
    base64Images.map(async (b64, index) => {
      try {
        const buf = Buffer.from(b64, "base64");

        // Process the image with sharp: remove metadata, convert to clean PNG
        const cleaned = await sharp(buf)
          .png()  //so,normalizing every image by converting everyone to png (a normalised format)
          .toBuffer();

        return cleaned.toString("base64");
      } catch (err) {
        console.warn(`Error enhancing image ${index + 1}:`, err.message);
        return b64; // fallback to original if sharp fails
      }
    })
  );


/** Coordinate adjustment function for PDF */
const adjustCoordinatesForPDF = (bb, pageW, pageH, imgW, imgH) => {
  imgW = imgW || pageW;
  imgH = imgH || pageH;

  const xScale = pageW / imgW;
  const yScale = pageH / imgH;

  return {
    x: bb.x * xScale,
    y: pageH - (bb.y + bb.height) * yScale,
    width: bb.width * xScale,
    height: bb.height * yScale,
  };
};

/** Enhanced text block classification */
const classifyTextBlock = (boundingBox, pageW, pageH, originalText = "") => {
  const aspectRatio = boundingBox.width / boundingBox.height;
  const area = boundingBox.width * boundingBox.height;

  const centerX = boundingBox.x + boundingBox.width / 2;
  const centerY = boundingBox.y + boundingBox.height / 2;
  const isNearEdge = (
    centerX < pageW * 0.05 || centerX > pageW * 0.95 ||
    centerY < pageH * 0.05 || centerY > pageH * 0.95
  );

  const hasSoundEffectPatterns = /[！!？?♪♫…]{4,}|[A-Z]{5,}|[ぁ-んァ-ン]{1,2}(?:[？！]{3,})/i.test(originalText);
  const hasJapaneseOnomatopoeia = /^(ドド|バン|ゴゴ|ドン|ガン|キラ|ポン|パン|ザザ|ぺら)$/i.test(originalText);

  const hasTitlePattern = /[\u3040-\u30FF]+\s.*[A-Za-z]+/.test(originalText) && originalText.length > 10;

  if (hasTitlePattern) {
    return 'title';
  } else if (hasJapaneseOnomatopoeia || hasSoundEffectPatterns || area < 150 || aspectRatio > 5 || aspectRatio < 0.1) {
    return 'soundEffect';
  } else if (isNearEdge && area > 4000 && aspectRatio < 0.3) {
    return 'narration';
  } else {
    return 'speechBubble';
  }
};

/** Text layout function with improved line breaking */
const layoutText = (text, font, fontSize, maxWidth) => {
  text = text.trim().replace(/\s+/g, ' ');

  if (font.widthOfTextAtSize(text, fontSize) <= maxWidth) {
    return [text];
  }

  const sentences = text.split(/(?<=[.!?])\s+/);
  const lines = [];
  let currentLine = '';

  for (let sentence of sentences) {
    sentence = sentence.trim();
    if (!sentence) continue;

    const testLine = currentLine ? `${currentLine} ${sentence}` : sentence;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) {
        lines.push(currentLine);
      }

      if (font.widthOfTextAtSize(sentence, fontSize) <= maxWidth) {
        lines.push(sentence);
        currentLine = '';
      } else {
        const words = sentence.split(/\s+/);
        let tempLine = words[0] || '';

        for (let i = 1; i < words.length; i++) {
          const word = words[i];
          const testTempLine = `${tempLine} ${word}`;
          const tempWidth = font.widthOfTextAtSize(testTempLine, fontSize);

          if (tempWidth <= maxWidth) {
            tempLine = testTempLine;
          } else {
            if (tempLine) {
              lines.push(tempLine);
            }
            tempLine = word;
          }
        }

        if (tempLine) {
          currentLine = tempLine;
        } else {
          currentLine = '';
        }
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  console.log(`Laid out text "${text}" into ${lines.length} lines:`, lines);
  return lines;
};

/** Font size calculation with dynamic adjustment */
const calculateOptimalFontSize = (text, boxWidth, boxHeight, font, maxFontSize = 18) => {
  let fontSize = 16; // Starting font size

  // Adjust font size based on text density and box dimensions (initial reduction)
  const textLength = text.length;
  const boxArea = boxWidth * boxHeight;
  const textDensity = textLength / boxArea;

  if (textDensity > 0.0005) fontSize = Math.min(fontSize, 15);
  if (textDensity > 0.001) fontSize = Math.min(fontSize, 14);
  if (textDensity > 0.003) fontSize = Math.min(fontSize, 13);
  if (textDensity > 0.006) fontSize = Math.min(fontSize, 12);
  if (textDensity > 0.010) fontSize = Math.min(fontSize, 11);
  if (textDensity > 0.015) fontSize = Math.min(fontSize, 10);

  // Adjust based on box width
  if (boxWidth < 100) fontSize = Math.min(fontSize, 14);
  if (boxWidth < 80) fontSize = Math.min(fontSize, 13);
  if (boxWidth < 60) fontSize = Math.min(fontSize, 12);
  if (boxWidth < 40) fontSize = Math.min(fontSize, 11);

  // Adjust based on box area
  if (boxArea < 3000) fontSize = Math.min(fontSize, 14);
  if (boxArea < 2000) fontSize = Math.min(fontSize, 13);
  if (boxArea < 1000) fontSize = Math.min(fontSize, 12);

  // Ensure text fits by reducing font size if necessary
  let lines = layoutText(text, font, fontSize, boxWidth - 10); // Add padding
  let lineHeight = fontSize * 1.2;
  let estimatedHeight = lines.length * lineHeight;
  let maxLineWidth = Math.max(...lines.map(line => font.widthOfTextAtSize(line, fontSize)));

  while (fontSize >= 8 && (estimatedHeight > boxHeight - 10 || maxLineWidth > boxWidth - 10)) {
    fontSize -= 0.5;
    lines = layoutText(text, font, fontSize, boxWidth - 10);
    lineHeight = fontSize * 1.2;
    estimatedHeight = lines.length * lineHeight;
    maxLineWidth = Math.max(...lines.map(line => font.widthOfTextAtSize(line, fontSize)));
  }

  // Increase font size if there's extra space
  while (fontSize < maxFontSize) {
    const testFontSize = fontSize + 0.5;
    const testLines = layoutText(text, font, testFontSize, boxWidth - 10);
    const testLineHeight = testFontSize * 1.2;
    const testHeight = testLines.length * testLineHeight;
    const testMaxLineWidth = Math.max(...testLines.map(line => font.widthOfTextAtSize(line, testFontSize)));

    if (testHeight <= boxHeight - 10 && testMaxLineWidth <= boxWidth - 10) {
      fontSize = testFontSize;
      lines = testLines;
      lineHeight = testLineHeight;
      estimatedHeight = testHeight;
      maxLineWidth = testMaxLineWidth;
    } else {
      break;
    }
  }

  console.log(`Calculated font size ${fontSize} for text "${text}" with ${lines.length} lines (height: ${estimatedHeight}, boxHeight: ${boxHeight}, maxLineWidth: ${maxLineWidth}, boxWidth: ${boxWidth})`);
  return fontSize;
};

/** Text drawing function with outline */
const drawTextWithOutline = (page, text, x, y, fontSize, font, options = {}) => {
  const {
    textColor = rgb(0, 0, 0),
    outlineColor = rgb(1, 1, 1),
    outlineWidth = 1.0,
    isSoundEffect = false
  } = options;

  if (outlineWidth > 0) {
    const offsets = [
      [-outlineWidth, 0], [outlineWidth, 0],
      [0, -outlineWidth], [0, outlineWidth],
      [-outlineWidth, -outlineWidth], [outlineWidth, outlineWidth],
      [-outlineWidth, outlineWidth], [outlineWidth, -outlineWidth]
    ];

    for (const [dx, dy] of offsets) {
      page.drawText(text, {
        x: x + dx,
        y: y + dy,
        size: fontSize,
        font: font,
        color: outlineColor,
        lineHeight: fontSize * 1.2,
        opacity: 1.0
      });
    }
  }

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: textColor,
    lineHeight: fontSize * 1.2,
    opacity: 1.0
  });
};

/** Text drawing function */
const drawText = (page, text, x, y, fontSize, font, options = {}) => {
  const { textColor = rgb(0, 0, 0), isNarration = false, isSoundEffect = false } = options;

  drawTextWithOutline(page, text, x, y, fontSize, font, {
    textColor,
    outlineColor: rgb(1, 1, 1),
    outlineWidth: fontSize * 0.2,
    isSoundEffect
  });
};

/** Multi-line text rendering with improved positioning */
const renderMultiLineText = (page, lines, box, fontSize, font, type, options = {}) => {
  const padding = 5; // Add padding to prevent clipping
  const lineHeight = fontSize * 1.2;
  const totalTextHeight = lines.length * lineHeight;

  // Ensure the text fits within the box height
  let startY;
  if (totalTextHeight > box.height - padding * 2) {
    startY = box.y + box.height - lineHeight - padding;
  } else {
    startY = box.y + (box.height - totalTextHeight) / 2 + (fontSize * 0.2);
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = startY + (lineHeight * (lines.length - 1 - i)); // Bottom-up rendering

    // Ensure the line is within the bounding box
    if (lineY < box.y + padding || lineY > box.y + box.height - padding) {
      console.warn(`Line "${line}" at y=${lineY} is outside bounding box (y=${box.y}, height=${box.height})`);
      continue;
    }

    const textWidth = font.widthOfTextAtSize(line, fontSize);
    let lineX = box.x + (box.width - textWidth) / 2;

    // Add padding to prevent clipping at the edges
    lineX = Math.max(box.x + padding, Math.min(lineX, box.x + box.width - textWidth - padding));

    let textColor = rgb(0, 0, 0);
    if (type === 'soundEffect') {
      textColor = rgb(0, 0, 0);
    }

    drawText(
      page,
      line,
      lineX,
      lineY,
      fontSize,
      font,
      {
        textColor: textColor,
        isNarration: type === 'narration',
        isSoundEffect: type === 'soundEffect'
      }
    );
  }
};

/** Erase original text with a more natural background */
const eraseOriginalText = (page, boundingBox, options = {}) => {
  const {
    padding = 6,
    opacity = 1 // Reduced opacity for a more natural look
  } = options;

  page.drawRectangle({
    x: boundingBox.x - padding,
    y: boundingBox.y - padding,
    width: boundingBox.width + (padding * 2),
    height: boundingBox.height + (padding * 2),
    color: rgb(1, 1, 1),
    opacity: opacity,
    borderWidth: 0
  });
};

/** Overlay translations directly on PDF */
const overlayTranslations = async (pdfDoc, visionResults) => {
  try {
    let dialogueFont;  //komika 
    let narrationFont;
    let soundEffectFont;
    let japaneseFont;
    let latinFallbackFont;

    try {
      pdfDoc.registerFontkit(fontkit); 

      // Load Dialogue Font (KosugiMaru.ttf)
      try {
        const dialogueFontPath = path.join(__dirname, "fonts", "animeace.ttf");
        const fontBytes = fs.readFileSync(dialogueFontPath);
        dialogueFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log("Successfully embedded Komika font");
      } catch (err) {
        console.warn("Could not load Komika font, falling back to Helvetica:", err.message);
        dialogueFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      }

      // Load Narration Font (CCWildWords)
      try {
        const narrationFontPath = path.join(__dirname, "fonts", "CCWildWords.ttf");
        const fontBytes = fs.readFileSync(narrationFontPath);
        narrationFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log("Successfully embedded CCWildWords font");
      } catch (err) {
        console.warn("Could not load CCWildWords font, using dialogue font:", err.message);
        narrationFont = dialogueFont;
      }

      // Load Sound Effect Font (BadaBoom)
      try {
        const soundEffectFontPath = path.join(__dirname, "fonts", "BadaBoom.ttf");
        const fontBytes = fs.readFileSync(soundEffectFontPath);
        soundEffectFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log("Successfully embedded BadaBoom font");
      } catch (err) {
        console.warn("Could not load BadaBoom font, using dialogue font:", err.message);
        soundEffectFont = dialogueFont;
      }

      // Load Japanese Font (SourceHanSansJP-Regular) - Optional
      var japaneseFontLoaded = false ;
      try {
        const japaneseFontPath = path.join(__dirname, "fonts", "SourceHanSansJP-Regular.otf");
        const fontBytes = fs.readFileSync(japaneseFontPath);
        japaneseFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log("Successfully embedded SourceHanSansJP-Regular font");
        japaneseFontLoaded = true;
      } catch (err) {
        console.warn("Could not load SourceHanSansJP-Regular font, Japanese text may not render correctly:", err.message);
        japaneseFont = dialogueFont;
      }

      // Load Latin Fallback Font (DejaVuSans)
      try {
        const latinFontPath = path.join(__dirname, "fonts", "DejaVuSans.ttf");
        const fontBytes = fs.readFileSync(latinFontPath);
        latinFallbackFont = await pdfDoc.embedFont(fontBytes, { subset: false });
        console.log("Successfully embedded DejaVuSans font as Latin fallback");
      } catch (err) {
        console.warn("Could not load DejaVuSans font, using dialogue font as fallback:", err.message);
        latinFallbackFont = dialogueFont;
      }
    } catch (err) {
      console.error("Error in font loading:", err.message);
      throw err;
    }

    const pages = pdfDoc.getPages();

    for (let pageNum = 1; pageNum <= pages.length; pageNum++) {
      const pageEntries = visionResults.filter(entry => entry.page === pageNum);
      if (!pageEntries.length) continue;

      const pdfPage = pages[pageNum - 1];
      const { width: pw, height: ph } = pdfPage.getSize();

      let translations = [];
      pageEntries.forEach(entry => {
        if (entry.translations && Array.isArray(entry.translations)) {
          translations = translations.concat(entry.translations.map(t => ({
            ...t,
            boundingBox: adjustCoordinatesForPDF(
              t.boundingBox,
              pw,
              ph,
              entry.imageWidth || pw,
              entry.imageHeight || ph
            ),
            imageWidth: entry.imageWidth,
            imageHeight: entry.imageHeight
          })));
        }
      });

      if (!translations.length) continue;

      // Erase original text
      for (const translation of translations) {
        const { boundingBox } = translation;

        if (boundingBox.originalBlocks && boundingBox.originalBlocks.length > 0) {
          for (const block of boundingBox.originalBlocks) {
            const adjustedBlock = adjustCoordinatesForPDF(
              block.boundingBox,
              pw,
              ph,
              translation.imageWidth || pw,
              translation.imageHeight || ph
            );
            eraseOriginalText(pdfPage, adjustedBlock, { padding: 6 });
          }
        } else {
          eraseOriginalText(pdfPage, boundingBox, { padding: 6 });
        }
      }

      // Overlay translated text
      for (const translation of translations) {
        const { boundingBox, translatedText, type } = translation;

        if (!translatedText?.trim()) continue;

        const cleanedText = translatedText
          .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
          .trim();

        if (!cleanedText) continue;

        // Detect if the text contains Japanese characters
        const hasJapanese = /[\u3000-\u303F\u3040-\u309F\u30A0-\u30FF\uFF00-\uFFEF]/.test(cleanedText);

        // Select the base font based on text type
        let baseFont;
        let maxFontSize;

        if (type === 'speechBubble' || type === 'title') {
          baseFont = dialogueFont;
          maxFontSize = 18;
        } else if (type === 'narration') {
          baseFont = narrationFont;
          maxFontSize = 18;
        } else if (type === 'soundEffect') {
          baseFont = soundEffectFont;
          maxFontSize = 20;
        } else {
          baseFont = dialogueFont;
          maxFontSize = 18;
        }

        // Select the final font based on text content
        let font = baseFont;
        if (hasJapanese) {
          if (japaneseFontLoaded) {
            font = japaneseFont;
          } else {
            console.warn(`Japanese text "${cleanedText}" detected but Japanese font not loaded, falling back to ${baseFont.name}`);
            font = baseFont;
          }
        } else {
          // Check if the base font can render all characters; if not, fall back to DejaVuSans
          try {
            const glyphs = cleanedText.split('').map(char => baseFont.getGlyphID(char.charCodeAt(0)));
            if (glyphs.includes(0)) { // 0 indicates a missing glyph
              console.log(`Text "${cleanedText}" contains unsupported characters in ${type} font, falling back to DejaVuSans`);
              font = latinFallbackFont;
            }
          } catch (err) {
            console.warn(`Error checking glyphs for text "${cleanedText}", falling back to DejaVuSans:`, err.message);
            font = latinFallbackFont;
          }
        }

        const fontSize = calculateOptimalFontSize(
          cleanedText,
          boundingBox.width,
          boundingBox.height,
          font,
          maxFontSize
        );

        const maxWidth = boundingBox.width - 10; // Add padding
        const lines = layoutText(cleanedText, font, fontSize, maxWidth);

        renderMultiLineText(
          pdfPage,
          lines,
          boundingBox,
          fontSize,
          font,
          type,
          {
            textColor: rgb(0, 0, 0)
          }
        );
      }
    }

    return pdfDoc;
  } catch (err) {
    console.error("Error in overlay process:", err);
    throw err;
  }
};

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file?.path) return res.status(400).json({ error: "No file uploaded" });

    const { data } = await axios.get(req.file.path, { responseType: "arraybuffer" });
    const pdfBuffer = Buffer.from(data);    //arraybuffer to node js buffer

    const tempDoc = await PDFDocument.load(pdfBuffer, {ignoreEncryption:true});  //stores pdf 
    const dims = tempDoc.getPages().map(p => {   //This code is resizing all the pages of the PDF proportionally (keeping aspect ratio intact) such that the larger side becomes 1024 pixels, and the smaller side is scaled accordingly , normalization of images (universally accepted formula) , we are not changing width and height now(just overwriting their values)
      const { width, height } = p.getSize();
      const max = 1024;
      return width > height      
        ? { width: max, height: Math.round((height / width) * max) }
        : { height: max, width: Math.round((width / height) * max) };
    });  //dims is an array of objects where each arr[i] is an obj which contains normalised height and width of the page i .

    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    let pagesData = [];
    let density = 100;

    const converterOptions = {
      density: density,
      format: "png",
      width: dims[0].width,
      height: dims[0].height,
      savePath: tempDir,
      saveFilename: `page_${Date.now()}`
    };

    console.log(`Converting PDF pages to images with density ${density}...`);
    try {
      const converter = fromBuffer(pdfBuffer, converterOptions);
      pagesData = await converter.bulk(-1);
      console.log(`Converted ${pagesData.length} pages`);
    } catch (error) {
      console.warn(`Initial conversion failed at density ${density}: ${error.message}`);
      density = 72;
      console.log(`Retrying with lower density ${density}...`);
      try {
        const converter = fromBuffer(pdfBuffer, {
          ...converterOptions,
          density: density  //overriding density with new one (baaki sab same rahega)
        });
        pagesData = await converter.bulk(-1);
        console.log(`Fallback conversion successful: Converted ${pagesData.length} pages`);
      } catch (fallbackError) {
        console.error("Fallback conversion failed:", fallbackError.message);
        return res.status(500).json({
          error: "Failed to convert PDF to images. This may be due to a corrupted PDF, missing GraphicsMagick/Ghostscript installation, or unsupported PDF features. Please ensure GraphicsMagick and Ghostscript are installed and try with a different PDF."
        });
      }
    }

    const base64s = [];
    for (const page of pagesData) {
      try {
        if (fs.existsSync(page.path)) {
          const buf = fs.readFileSync(page.path);
          base64s.push(buf.toString("base64"));
          fs.unlinkSync(page.path);
        } else {
          console.warn(`Image file for page ${page.name} not found at ${page.path}`);
        }
      } catch (error) {
        console.warn(`Error reading image file for page ${page.name}:`, error.message);
      }
    }

    if (base64s.length === 0) {
      return res.status(500).json({ error: "No pages were successfully converted to images." });
    }

    console.log("Enhancing images for better text detection...");
    const enhanced = await enhanceImagesForTextDetection(base64s);

    console.log("Processing with Google Vision and Translation APIs...");
    let visionResults = await processAllPages(enhanced, dims);  //Also translates detected text and returns an array of objects(each obj contains info about each page)
    console.log("Vision and Translation processing complete");

    visionResults = visionResults.map((pg, i) => ({  //adding meta data to each of the objects
      page: i + 1,
      ...pg,
      imageWidth: dims[i].width,
      imageHeight: dims[i].height
    }));

    console.log("Creating new PDF document");
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    console.log("Adding pages to PDF");
    for (let i = 0; i < enhanced.length; i++) {
      const img = Buffer.from(enhanced[i], "base64");
      const png = await pdfDoc.embedPng(img);
      const page = pdfDoc.addPage([dims[i].width, dims[i].height]);
      page.drawImage(png, { x: 0, y: 0, width: dims[i].width, height: dims[i].height });
    }

    console.log("Overlaying translations");
    await overlayTranslations(pdfDoc, visionResults);

    console.log("Saving PDF");
    const outBuf = await pdfDoc.save();

    console.log("Uploading to Cloudinary");
    const { secure_url } = await uploadPdfToCloudinary(Buffer.from(outBuf));
    console.log("File uploaded, link:", secure_url);

    return res.status(200).json({ url_link: secure_url });   //or simply -> res.json({url_link:secure_url}) ,by default 200 hota hai

  } catch (err) {
    console.error("Error in upload process:", err);
    return res.status(500).json({ error: err.message });
  } finally {
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));