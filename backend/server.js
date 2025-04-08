import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import Tesseract from 'tesseract.js';
import axios from 'axios';
import { convertPDFToImages } from './services/pdfConverter.js'; // <-- Import our PDF converter
import upload from "./services/cloudinary/upload.js";  // our configured Multer

const app = express();
app.use(cors());


// app.post('/upload', upload.single('file'), async (req, res) => {
//   try {
//     console.log('File uploaded:', req.file);
//     const filePath = req.file.path;
//     const fileExtension = path.extname(filePath).toLowerCase();

//     let extractedText = "";

//     if (fileExtension === ".pdf") {
//       // 1) Convert PDF pages to images
//       const imagePaths = await convertPDFToImages(filePath);
//       console.log("PDF converted. Image paths:", imagePaths);

//       // 2) Run OCR on each page in sequence
//       for (const imagePath of imagePaths) {
//         const { data: { text } } = await Tesseract.recognize(imagePath, 'eng');
//         extractedText += text + "\n\n"; // Append OCR text from each page
//       }

//       // (Optional) Clean up the generated images if you don't need them
//       // for (const imagePath of imagePaths) {
//       //   fs.unlinkSync(imagePath);
//       // }
//     } else {
//       // If it's an image, run OCR directly
//       const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
//       extractedText = text;
//     }

//     // 3) Translate the extracted text (if needed)
//     let translatedText = '';
//     try {
//       const translationResponse = await axios.get('https://api.mymemory.translated.net/get', {
//         params: {
//           q: extractedText,
//           langpair: 'en|hi',
//         },
//       });
//       translatedText = translationResponse.data.responseData.translatedText;
//     } catch (translationError) {
//       console.error('Translation Error:', translationError.message);
//     }

//     // (Optional) Delete the original PDF or image after processing
//     // fs.unlinkSync(filePath);

//     // Return the result
//     res.json({
//       message: 'File processed successfully',
//       ocrText: extractedText,
//       translatedText,
//     });
//   } catch (error) {
//     console.error('Error processing file:', error);
//     res.status(500).json({ error: error.message });
//   }
// });

//3rd step of cloudinary setup . upload -> imported from ./uploads.js and here-> doing upload.single('file'), multer uploads the file to the specific location ,afterwards multer attaches the file information in req.file  
app.post('/upload',upload.single('file'), async(req , res)=>{
  try{
    if(req.file && req.file.path){
      console.log("file uploaded successfully with url " , req.file.path);

    }
    else{
      console.log("there is no req.file and req.file.path returned from cloudinary");
    }

  }
  catch(e){
    console.log("cloudinary upload failed")
  }
})

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


