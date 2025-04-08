// // AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8


// import fs from 'fs';
// import axios from 'axios';
// import FormData from 'form-data';
// import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// /**
//  * Calls the Gemini API to process a PDF.
//  * The API is expected to extract text with coordinates and translate the text.
//  * The prompt instructs Gemini on what to do.
//  */
// async function callGeminiForPDF(pdfPath) {
//   const geminiApiKey = "AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8"; // Replace with your actual API key
//   const geminiEndpoint = "https://api.gemini.ai/extractAndTranslate"; // Hypothetical endpoint

//   // Build the prompt to instruct Gemini
//   const prompt = `
//   You are an OCR and translation service. For the provided PDF, please:
//   1. Extract all text elements along with their bounding box coordinates on each page.
//   2. Translate the extracted text from English to Hindi.
//   3. Return the results as a JSON array where each element contains:
//      - "page": the page number (1-indexed),
//      - "boundingBox": an object with properties x, y, width, and height (in PDF coordinate space),
//      - "translatedText": the translated text for that block.
//   `;

//   // Prepare the form data with the PDF file and the prompt
//   const form = new FormData();
//   form.append('file', fs.createReadStream(pdfPath));
//   form.append('prompt', prompt);

//   try {
//     const response = await axios.post(geminiEndpoint, form, {
//       headers: {
//         ...form.getHeaders(),
//         Authorization: `Bearer ${geminiApiKey}`,
//       },
//     });
//     // Assume response.data.elements is the JSON array of results.
//     return response.data.elements;
//   } catch (error) {
//     console.error("Error calling Gemini API:", error.response?.data || error.message);
//     throw error;
//   }
// }
// pdfpath = './new.png'
// callGeminiForPDF(pdfpath)



// import { GoogleGenerativeAI } from "@google/generative-ai";

// // Initialize the client with your API key from environment variables
// const genAI = new GoogleGenerativeAI('AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8');

// // Get the generative model
// const model = genAI.getGenerativeModel({ model: 'models/gemini-1.5-pro' });

// // Assume you have an image buffer from a PDF page
// const imageBuffer = await fetch('./new.png')
//     .then(response => response.arrayBuffer());

// // Build a prompt instructing Gemini to extract and translate text
// const prompt = `
//   You are an OCR and translation engine. For the provided image of a document page, please:
//   1. Extract all text along with their bounding box coordinates.
//   2. Translate the extracted text from English to Hindi.
//   3. Return the results in a JSON array format where each object contains:
//      - "boundingBox": { "x": number, "y": number, "width": number, "height": number },
//      - "translatedText": string
// `;

// const result = await model.generateContent([
//   {
//     inlineData: {
//       data: Buffer.from(imageBuffer).toString("base64"),
//       mimeType: "image/png",
//     },
//   },
//   prompt,
// ]);

// console.log(result.response.text());


import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";


// Access your API key
const genAI = new GoogleGenerativeAI('AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8');

// Load the model
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });

// Path to your image
const filePath = "./garou.png"; // Make sure this file exists

async function run() {
  try {
    const imageBuffer = fs.readFileSync(filePath);
    const base64Image = imageBuffer.toString("base64");
    const mimeType = "image/png";

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType,
        },
      },
      `You are an OCR and translation engine. For the provided image of a document page, please:
        1. Extract all text along with their bounding box coordinates.
        2. Translate the extracted text from japanese to english(make it look great and readable).
        3. Return the results in a JSON array format where each object contains:
           - "boundingBox": { "x": number, "y": number, "width": number, "height": number },
           - "translatedText": string,`
    ]);

    const response = await result.response.text();
    console.log("Gemini Result:\n", response);
  } catch (error) {
    console.error("Error:\n", error);
  }
}

run();
