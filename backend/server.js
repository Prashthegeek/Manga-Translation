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
import sharp from "sharp";
import streamifier from "streamifier";

// pdf-lib and fontkit
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Google Cloud services
import { ImageAnnotatorClient } from "@google-cloud/vision";
import { TranslationServiceClient } from "@google-cloud/translate";


const app = express();
app.use(cors());
app.use(express.json());


// Initialize Google Cloud clients
const visionClient = new ImageAnnotatorClient({keyFileName:process.env.GOOGLE_APPLICATION_CREDENTIALS});
const translationClient = new TranslationServiceClient({keyFileName:process.env.GOOGLE_APPLICATION_CREDENTIALS});

const projectId =  process.env.GOOGLE_CLOUD_PROJECT_ID ;
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

/** Adjust bounding box from image to PDF coords */
const adjustCoordinates = (bb, pageW, pageH, imgW, imgH) => {
  const xScale = pageW / imgW;
  const yScale = pageH / imgH;
  const x = bb.x * xScale;
  const y = pageH - (bb.y + bb.height) * yScale; // Y coordinates in PDF start from bottom
  return {
    x,
    y,
    width: bb.width * xScale,
    height: bb.height * yScale,
  };
};


/** Draw text with background for better readability */
const drawTextWithBackground = (page, text, x, y, fontSize, font, options = {}) => {
  const { 
    bgColor = rgb(1, 1, 1), 
    textColor = rgb(0, 0, 0),
    padding = 2,
    opacity = 0.7 
  } = options;
  
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  
  // Draw semi-transparent background
  page.drawRectangle({
    x: x - padding,
    y: y - padding,
    width: textWidth + (padding * 2),
    height: textHeight + (padding * 2),
    color: bgColor,
    opacity: opacity
  });
  
  // Draw text
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: textColor
  });
};

/** Process a single image with Google Vision and translate the text */
/** Process a single image with Google Vision and translate the text */
async function processImageWithVisionAndTranslate(base64Image, pageNumber) {
  try {
    // Detect text with Google Vision API
    const [textDetectionResult] = await visionClient.textDetection({
      image: { content: base64Image }
    });
    
    // If no text detected, return early
    if (!textDetectionResult.textAnnotations || textDetectionResult.textAnnotations.length === 0) {
      console.log(`No text detected on page ${pageNumber}`);
      return { page: pageNumber, translations: [] };
    }
    
    // Extract full text detection (this gives us text blocks)
    const fullTextAnnotation = textDetectionResult.fullTextAnnotation;
    let textBlocks = [];
    
    if (fullTextAnnotation && fullTextAnnotation.pages && fullTextAnnotation.pages.length > 0) {
      // Use structured text output for better text blocks
      const page = fullTextAnnotation.pages[0];
      
      // Process blocks which are better grouped
      for (const block of page.blocks || []) {
        let blockText = "";
        let boundingBox = null;
        
        // Get vertices of the block
        if (block.boundingBox && block.boundingBox.vertices) {
          const vertices = block.boundingBox.vertices;
          const xs = vertices.map(v => v.x || 0);
          const ys = vertices.map(v => v.y || 0);
          
          boundingBox = {
            x: Math.min(...xs),
            y: Math.min(...ys),
            width: Math.max(...xs) - Math.min(...xs),
            height: Math.max(...ys) - Math.min(...ys)
          };
        }
        
        // Get text from paragraphs and words
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
            boundingBox
          });
        }
      }
    } else {
      // Fallback to basic annotations
      const blockAnnotations = textDetectionResult.textAnnotations.slice(1);
      
      for (const annotation of blockAnnotations) {
        // Get bounding box coordinates from vertices
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
    
    // No text blocks found
    if (textBlocks.length === 0) {
      return { page: pageNumber, translations: [] };
    }
    
    // Group nearby text blocks that might be part of the same speech bubble
    const mergedBlocks = [];
    const processed = new Set();
    
    for (let i = 0; i < textBlocks.length; i++) {
      if (processed.has(i)) continue;
      
      const current = textBlocks[i];
      const group = [current];
      processed.add(i);
      
      // Find other blocks that are close to this one
      for (let j = 0; j < textBlocks.length; j++) {
        if (processed.has(j)) continue;
        
        const other = textBlocks[j];
        const yDiff = Math.abs(current.boundingBox.y - other.boundingBox.y);
        const yThreshold = Math.max(current.boundingBox.height, other.boundingBox.height) * 0.7;
        
        // If they're on the same line and near each other horizontally
        if (yDiff < yThreshold) {
          const xDist = Math.min(
            Math.abs(current.boundingBox.x - (other.boundingBox.x + other.boundingBox.width)),
            Math.abs(other.boundingBox.x - (current.boundingBox.x + current.boundingBox.width))
          );
          const xThreshold = Math.max(current.boundingBox.width, other.boundingBox.width) * 0.3;
          
          if (xDist < xThreshold) {
            group.push(other);
            processed.add(j);
          }
        }
      }
      
      // Merge the text blocks
      const mergedText = group.map(b => b.text).join(" ");
      
      // Calculate combined bounding box
      const xs = group.map(b => b.boundingBox.x);
      const ys = group.map(b => b.boundingBox.y);
      const rights = group.map(b => b.boundingBox.x + b.boundingBox.width);
      const bottoms = group.map(b => b.boundingBox.y + b.boundingBox.height);
      
      const mergedBox = {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...rights) - Math.min(...xs),
        height: Math.max(...bottoms) - Math.min(...ys)
      };
      
      mergedBlocks.push({
        text: mergedText,
        boundingBox: mergedBox
      });
    }
    
    // Translate all merged blocks
    const textsToTranslate = mergedBlocks.map(block => block.text);
    
    // Batch translate
    const formattedParent = translationClient.locationPath(projectId, location);
    const [translationResponse] = await translationClient.translateText({
      parent: formattedParent,
      contents: textsToTranslate,
      mimeType: 'text/plain',
      sourceLanguageCode: 'ja',
      targetLanguageCode: 'en',
    });
    
    // Combine results
    const translations = mergedBlocks.map((block, index) => {
      return {
        boundingBox: block.boundingBox,
        originalText: block.text,
        translatedText: translationResponse.translations[index].translatedText
      };
    });
    
    return { page: pageNumber, translations };
  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    return { page: pageNumber, translations: [] };
  }
}
/** Process all pages */
async function processAllPages(base64Images) {
  console.log(`Processing ${base64Images.length} pages...`);
  
  const results = [];
  // Process in smaller batches to avoid memory issues and rate limits
  const batchSize = 2;
  
  for (let i = 0; i < base64Images.length; i += batchSize) {
    console.log(`Processing batch starting at page ${i+1}`);
    const batch = base64Images.slice(i, i + batchSize);
    const batchPromises = batch.map((base64, idx) => 
      processImageWithVisionAndTranslate(base64, i + idx + 1)
    );
    
    try {
      // Process batch in parallel
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    } catch (error) {
      console.error(`Error processing batch starting at page ${i+1}:`, error);
    }
    
    // Add a small delay between batches to avoid rate limits
    if (i + batchSize < base64Images.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Processed ${results.length} out of ${base64Images.length} pages`);
  return results;
}


/** Improved overlay that tags pages and dedups per-page */
/** Improved overlay function to prevent text overlapping */

/** Enhanced text drawing with better background effects */
const drawTextWithBorder = (page, text, x, y, fontSize, font, options = {}) => {
  const { 
    bgColor = rgb(1, 1, 1), 
    textColor = rgb(0, 0, 0),
    borderColor = rgb(0, 0, 0),
    padding = 4,
    opacity = 0.85,
    borderWidth = 0.5  
  } = options;
  
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  
  // Draw border with rounded corners (simulaton)
  if (borderWidth > 0) {
    // Main rectangle
    page.drawRectangle({
      x: x - padding - borderWidth,
      y: y - padding - borderWidth,
      width: textWidth + (padding * 2) + (borderWidth * 2),
      height: textHeight + (padding * 2) + (borderWidth * 2),
      color: borderColor,
      opacity: opacity
    });
  }
  
  // Draw slightly smaller background for inner area
  page.drawRectangle({
    x: x - padding,
    y: y - padding,
    width: textWidth + (padding * 2),
    height: textHeight + (padding * 2),
    color: bgColor,
    opacity: opacity
  });
  
  // Draw text
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: textColor
  });
};


// Function to improve text detection by further enhancing image quality
const enhanceImagesForTextDetection = async (base64Images) =>
  Promise.all(
    base64Images.map(async (b64) => {
      const buf = Buffer.from(b64, "base64");
      
      // Enhanced image processing with improved parameters for manga text
      const out = await sharp(buf)
        .normalize() // Normalize the image to improve contrast
        .modulate({ brightness: 1.15, contrast: 1.4 }) // Increase contrast more
        .sharpen(1.0, 1.0, 0.8) // More aggressive sharpening
        .median(1) // Keep median filter for noise reduction
        .gamma(1.1) // Slight gamma adjustment to improve text visibility
        .toBuffer();
        
      return out.toString("base64");
    })
  );

// Improved function for grouping text based on visual proximity
const groupTextByVisualProximity = (textBlocks) => {
  const groups = [];
  const processed = new Set();
  
  // Sort by Y position first (top to bottom)
  textBlocks.sort((a, b) => a.boundingBox.y - b.boundingBox.y);
  
  for (let i = 0; i < textBlocks.length; i++) {
    if (processed.has(i)) continue;
    
    const current = textBlocks[i];
    const group = [current];
    processed.add(i);
    
    // Find visually connected blocks
    for (let j = 0; j < textBlocks.length; j++) {
      if (processed.has(j)) continue;
      
      const other = textBlocks[j];
      
      // Check if blocks are in same speech bubble based on various heuristics
      const yDiff = Math.abs(current.boundingBox.y - other.boundingBox.y);
      const yThreshold = Math.max(
        current.boundingBox.height, 
        other.boundingBox.height
      ) * 1.5;
      
      // X distance between blocks
      const xDist = Math.min(
        Math.abs(current.boundingBox.x - (other.boundingBox.x + other.boundingBox.width)),
        Math.abs(other.boundingBox.x - (current.boundingBox.x + current.boundingBox.width))
      );
      
      const xThreshold = Math.max(
        current.boundingBox.width, 
        other.boundingBox.width
      ) * 0.5;
      
      // Check if blocks are close vertically and horizontally aligned
      if (yDiff < yThreshold && xDist < xThreshold) {
        group.push(other);
        processed.add(j);
      }
    }
    
    // Sort group by y-coordinate, then x-coordinate
    group.sort((a, b) => {
      const yDiff = a.boundingBox.y - b.boundingBox.y;
      if (Math.abs(yDiff) < 10) {
        return a.boundingBox.x - b.boundingBox.x;
      }
      return yDiff;
    });
    
    // Merge text in reading order (important for Japanese)
    const mergedText = group.map(b => b.text).join(" ");
    
    // Calculate combined bounding box
    const xs = group.map(b => b.boundingBox.x);
    const ys = group.map(b => b.boundingBox.y);
    const rights = group.map(b => b.boundingBox.x + b.boundingBox.width);
    const bottoms = group.map(b => b.boundingBox.y + b.boundingBox.height);
    
    const mergedBox = {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...rights) - Math.min(...xs),
      height: Math.max(...bottoms) - Math.min(...ys)
    };
    
    groups.push({
      text: mergedText,
      boundingBox: mergedBox
    });
  }
  
  return groups;
};




//=============================================================================

// Enhanced overlap prevention function
const preventOverlap = (groups, pageWidth, pageHeight) => {
  // Sort top to bottom (how manga is typically read)
  groups.sort((a, b) => b.boundingBox.y - a.boundingBox.y);
  
  // Keep track of adjusted positions to avoid infinite loops
  const adjustedPositions = new Map();
  
  // First pass - check and resolve simple overlaps
  for (let i = 0; i < groups.length; i++) {
    const current = groups[i];
    const currentKey = `${i}`;
    let adjustmentsMade = false;
    let safetyCounter = 0; // Prevent infinite loops
    
    // Store original position
    if (!adjustedPositions.has(currentKey)) {
      adjustedPositions.set(currentKey, {...current.boundingBox});
    }
    
    do {
      adjustmentsMade = false;
      
      // Check overlap with every other box that's already positioned
      for (let j = 0; j < groups.length; j++) {
        if (i === j) continue;
        
        const other = groups[j];
        
        // Check for overlap
        if (boxesOverlap(current.boundingBox, other.boundingBox)) {
          // Resolve overlap and track that we made changes
          adjustmentsMade = resolveOverlap(current, other, pageWidth, pageHeight);
        }
      }
      
      safetyCounter++;
    } while (adjustmentsMade && safetyCounter < 5); // Limit iterations to prevent infinite loops
  }
  
  // Second pass - ensure boxes are within page boundaries
  for (let i = 0; i < groups.length; i++) {
    const box = groups[i].boundingBox;
    
    // Ensure box is within page boundaries
    box.x = Math.max(0, Math.min(box.x, pageWidth - box.width));
    box.y = Math.max(0, Math.min(box.y, pageHeight - box.height));
  }
  
  return groups;
};

// Improved overlap check with overlap percentage threshold
const boxesOverlap = (box1, box2) => {
  // Calculate overlap area
  const xOverlap = Math.max(0, 
    Math.min(box1.x + box1.width, box2.x + box2.width) - 
    Math.max(box1.x, box2.x)
  );
  
  const yOverlap = Math.max(0, 
    Math.min(box1.y + box1.height, box2.y + box2.height) - 
    Math.max(box1.y, box2.y)
  );
  
  // Calculate overlap area
  const overlapArea = xOverlap * yOverlap;
  
  // Calculate smaller box area for percentage comparison
  const box1Area = box1.width * box1.height;
  const box2Area = box2.width * box2.height;
  const smallerBoxArea = Math.min(box1Area, box2Area);
  
  // Boxes meaningfully overlap if the overlap area is greater than a threshold
  // percentage of the smaller box (e.g., 10%)
  const overlapThreshold = 0.1; // 10% overlap threshold
  
  return (xOverlap > 0 && yOverlap > 0) && 
         (overlapArea / smallerBoxArea > overlapThreshold);
};

// Enhanced resolve overlap function that returns whether adjustments were made
const resolveOverlap = (current, other, pageWidth, pageHeight) => {
  // Calculate the center points of both boxes
  const currentCenterX = current.boundingBox.x + current.boundingBox.width / 2;
  const currentCenterY = current.boundingBox.y + current.boundingBox.height / 2;
  const otherCenterX = other.boundingBox.x + other.boundingBox.width / 2;
  const otherCenterY = other.boundingBox.y + other.boundingBox.height / 2;
  
  // Store original position to check if we made changes
  const originalX = current.boundingBox.x;
  const originalY = current.boundingBox.y;
  
  // Calculate vector from other to current
  const vectorX = currentCenterX - otherCenterX;
  const vectorY = currentCenterY - otherCenterY;
  
  // Calculate minimum distances needed to separate
  const xMove = (current.boundingBox.width + other.boundingBox.width) / 2 - Math.abs(vectorX);
  const yMove = (current.boundingBox.height + other.boundingBox.height) / 2 - Math.abs(vectorY);
  
  // Add margin to prevent boxes from being too close
  const margin = 10;
  
  // Determine movement direction based on vector and minimum distance needed
  let newX = current.boundingBox.x;
  let newY = current.boundingBox.y;
  
  // Choose the direction requiring less movement (normalized by page dimensions)
  // This helps make more natural movements on different page sizes
  const normalizedXMove = xMove / pageWidth;
  const normalizedYMove = yMove / pageHeight;
  
  if (normalizedXMove <= normalizedYMove) {
    // Move horizontally - direction based on vector
    if (vectorX >= 0) {
      // Move current box right
      newX = Math.min(
        pageWidth - current.boundingBox.width, 
        current.boundingBox.x + xMove + margin
      );
    } else {
      // Move current box left
      newX = Math.max(0, current.boundingBox.x - xMove - margin);
    }
  } else {
    // Move vertically - direction based on vector
    if (vectorY >= 0) {
      // Move current box down
      newY = Math.min(
        pageHeight - current.boundingBox.height,
        current.boundingBox.y + yMove + margin
      );
    } else {
      // Move current box up
      newY = Math.max(0, current.boundingBox.y - yMove - margin);
    }
  }
  
  // Apply new position
  current.boundingBox.x = newX;
  current.boundingBox.y = newY;
  
  // Return whether changes were made
  return originalX !== newX || originalY !== newY;
}

// Enhanced text layout function with better line breaking
const layoutText = (text, font, fontSize, maxWidth) => {
  // Remove excessive whitespace
  text = text.trim().replace(/\s+/g, ' ');
  
  const words = text.split(/\s+/);
  const lines = [];
  let currentLine = words[0] || '';
  
  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const testLine = `${currentLine} ${word}`;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    
    if (width <= maxWidth) {
      currentLine = testLine;
    } else {
      // Check if the word itself is too long and needs hyphenation
      const wordWidth = font.widthOfTextAtSize(word, fontSize);
      if (wordWidth > maxWidth && word.length > 8) {
        // Add current line if not empty
        if (currentLine) {
          lines.push(currentLine);
        }
        
        // Hyphenate long word
        let part = '';
        for (let j = 0; j < word.length; j++) {
          const testPart = part + word[j];
          const testWidth = font.widthOfTextAtSize(testPart, fontSize);
          
          if (testWidth <= maxWidth) {
            part = testPart;
          } else {
            if (j > 0) {
              lines.push(part + '-');
              part = word[j];
            } else {
              // Even a single character is too wide, just add it anyway
              lines.push(word.substring(0, j + 1));
              part = '';
            }
          }
        }
        
        // Add any remaining part
        if (part) {
          currentLine = part;
        } else {
          currentLine = '';
        }
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
};

// Optimized font size calculation based on text and box size
const calculateOptimalFontSize = (text, boxWidth, boxHeight, font, maxFontSize = 12) => {
  // Start with maximum size
  let fontSize = maxFontSize;
  
  // Check how many characters we have - adjust starting font size for longer text
  if (text.length > 50) {
    fontSize = Math.min(fontSize, 10);
  }
  if (text.length > 100) {
    fontSize = Math.min(fontSize, 9);
  }
  
  // Reduce font size until text fits width and height limitations
  while (fontSize > 7) { // 7 is minimum readable size
    const lines = layoutText(text, font, fontSize, boxWidth - 8); // account for padding
    const estimatedHeight = lines.length * fontSize * 1.3; // increased line height factor for readability
    
    // If it fits, we're good
    if (estimatedHeight <= boxHeight) {
      break;
    }
    
    // Reduce font size and try again
    fontSize -= 0.5;
  }
  
  return fontSize;
};

// Improved text drawing with customizable styling
const drawTextWithStyling = (page, text, x, y, fontSize, font, options = {}) => {
  const { 
    bgColor = rgb(1, 1, 1),     // White background
    textColor = rgb(0, 0, 0),   // Black text
    borderColor = rgb(0, 0, 0), // Black border
    padding = 4,
    opacity = 0.85,             // Background opacity
    borderWidth = 1,            // Border width
    borderRadius = 0            // Border radius (simulation)
  } = options;
  
  const textWidth = font.widthOfTextAtSize(text, fontSize);
  const textHeight = fontSize;
  
  // Draw background with better styling
  if (borderRadius > 0) {
    // Simulate rounded corners (PDF doesn't support native rounded corners)
    // This is a simplified approach - for production, a more complex path would be better
    
    // Main rectangle
    page.drawRectangle({
      x: x - padding,
      y: y - padding - borderWidth/2,
      width: textWidth + (padding * 2),
      height: textHeight + (padding * 2),
      color: bgColor,
      opacity: opacity,
      borderColor: borderColor,
      borderWidth: borderWidth,
    });
  } else {
    // Standard rectangular background with border
    if (borderWidth > 0) {
      // Border
      page.drawRectangle({
        x: x - padding - borderWidth/2,
        y: y - padding - borderWidth/2,
        width: textWidth + (padding * 2) + borderWidth,
        height: textHeight + (padding * 2) + borderWidth,
        color: borderColor,
        opacity: opacity
      });
    }
    
    // Inner background
    page.drawRectangle({
      x: x - padding,
      y: y - padding,
      width: textWidth + (padding * 2),
      height: textHeight + (padding * 2),
      color: bgColor,
      opacity: opacity
    });
  }
  
  // Draw text with optional effects
  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color: textColor
  });
};

// Function to render multi-line text with advanced styling
const renderMultiLineText = (page, lines, x, y, fontSize, font, options = {}) => {
  const lineHeight = fontSize * 1.3; // Increased line height for better readability
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineY = y - (lineHeight * i);
    
    // Draw each line with styling
    drawTextWithStyling(
      page,
      line,
      x,
      lineY,
      fontSize,
      font,
      options
    );
  }
};

// Enhanced overlay function to apply text on PDF pages
const overlayTranslations = async (pdfDoc, visionResults) => {
  try {
    // Load fonts
    const fallbackFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    
    // Try to embed a CJK-compatible font if available
    let primaryFont;
    try {
      const fontPath = "./fonts/NotoSans-Regular.ttf";
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        primaryFont = await pdfDoc.embedFont(fontBytes);
      } else {
        primaryFont = fallbackFont;
      }
    } catch (err) {
      console.warn("Error loading font:", err.message);
      primaryFont = fallbackFont;
    }

    const pages = pdfDoc.getPages();
    
    // Process each page
    for (let pageNum = 1; pageNum <= pages.length; pageNum++) {
      const pageEntries = visionResults.filter(entry => entry.page === pageNum);
      if (!pageEntries.length) continue;
      
      const pdfPage = pages[pageNum - 1];
      const { width: pw, height: ph } = pdfPage.getSize();
      
      // Get all translations for this page
      let translations = [];
      pageEntries.forEach(entry => {
        if (entry.translations && Array.isArray(entry.translations)) {
          translations = translations.concat(entry.translations.map(t => ({
            ...t,
            boundingBox: adjustCoordinates(
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
      
      // Skip page if no translations
      if (!translations.length) continue;
      
      // Group text by visual proximity with improved algorithm
      const textBlocksForGrouping = translations.map(t => ({
        text: t.translatedText,
        boundingBox: t.boundingBox
      }));
      
      // Use improved grouping
      const groups = groupTextByVisualProximity(textBlocksForGrouping);
      
      // Add original texts information
      groups.forEach(group => {
        group.translatedText = group.text;
        delete group.text;
        
        // Find originals that correspond to this group
        const originalTexts = translations
          .filter(t => boxesOverlap(t.boundingBox, group.boundingBox))
          .map(t => t.originalText);
          
        group.originalTexts = originalTexts;
      });
      
      // Check for overlapping boxes and adjust
      const adjustedGroups = preventOverlap(groups, pw, ph);
      
      // Now overlay the adjusted translations
      for (const translation of adjustedGroups) {
        const { boundingBox, translatedText } = translation;
        
        if (!translatedText?.trim()) continue;
        
        const cleanedText = translatedText
          .replace(/[\uFFFD\uFFFE\uFFFF]/g, '')
          .trim();
        
        if (!cleanedText) continue;
        
        // Calculate optimal font size for text
        const fontSize = calculateOptimalFontSize(
          cleanedText, 
          boundingBox.width, 
          boundingBox.height,
          primaryFont, 
          11 // Slightly smaller max font size for better readability
        );
        
        // Lay out text into multiple lines
        const maxWidth = boundingBox.width - 8; // Account for padding
        const lines = layoutText(cleanedText, primaryFont, fontSize, maxWidth);
        
        // Calculate text block dimensions
        const lineHeight = fontSize * 1.3;
        const textBlockHeight = lines.length * lineHeight;
        
        // Center text vertically within bounding box
        let startY = boundingBox.y + boundingBox.height - (boundingBox.height - textBlockHeight) / 2;
        
        // Layout each line
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const textWidth = primaryFont.widthOfTextAtSize(line, fontSize);
          
          // Center text horizontally
          const x = boundingBox.x + (boundingBox.width - textWidth) / 2;
          const y = startY - lineHeight * i;
          
          // Draw text with improved styling
          drawTextWithStyling(
            pdfPage,
            line,
            x,
            y,
            fontSize,
            primaryFont,
            {
              bgColor: rgb(1, 1, 1),    // White background
              textColor: rgb(0, 0, 0),  // Black text
              borderColor: rgb(0, 0, 0), // Black border
              padding: 5,               // Slightly more padding
              opacity: 0.9,             // More opaque background for better readability
              borderWidth: 0.75         // Thin border
            }
          );
        }
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
      density: 300, 
      format: "png",
      width: dims[0].width, 
      height: dims[0].height,
      savePath: "./temp", 
      saveFilename: "page"
    });
    
    console.log("Converting PDF pages to images...");
    const pagesData = await converter.bulk(-1);
    console.log(`Converted ${pagesData.length} pages`);

    // read & cleanup
    const base64s = pagesData.map((p, i) => {
      const buf = fs.readFileSync(p.path);
      fs.unlinkSync(p.path);
      return buf.toString("base64");
    });

    // enhance then call Vision API
    console.log("Enhancing images for better text detection...");
    const enhanced = await enhanceImagesForTextDetection(base64s);
    
    console.log("Processing with Google Vision and Translation APIs...");
    let visionResults = await processAllPages(enhanced);
    console.log("Vision and Translation processing complete");

    // tag each page + attach dims
    visionResults = visionResults.map((pg, i) => ({
      page: i + 1,
      ...pg,
      imageWidth: dims[i].width,
      imageHeight: dims[i].height
    }));

    // Build new PDF & overlay
    console.log("Creating new PDF document");
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    // add image pages
    console.log("Adding pages to PDF");
    for (let i = 0; i < base64s.length; i++) {
      const img = Buffer.from(base64s[i], "base64");
      const png = await pdfDoc.embedPng(img);
      const page = pdfDoc.addPage([dims[i].width, dims[i].height]);
      page.drawImage(png, { x: 0, y: 0, width: dims[i].width, height: dims[i].height });
    }

    // overlay translations
    console.log("Overlaying translations");
    await overlayTranslations(pdfDoc, visionResults);

    // save & upload
    console.log("Saving PDF");
    const outBuf = await pdfDoc.save();
    
    console.log("Uploading to Cloudinary");
    const { secure_url } = await uploadPdfToCloudinary(Buffer.from(outBuf));
    console.log("File uploaded, link:", secure_url);
    
    return res.json({ url_link: secure_url });

  } catch (err) {
    console.error("Error in upload process:", err);
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
