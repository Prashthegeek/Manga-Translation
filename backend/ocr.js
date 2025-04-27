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



// import { GoogleGenerativeAI } from "@google/generative-ai";
// import JSON5 from 'json5';


// // Access your API key
// const genAI = new GoogleGenerativeAI('AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8');

// // Load the model
// const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-pro" });

// export async function processImageWithGemini(base64Image, pageNumber) {
//   // Remove prefix if exists
//   const cleanBase64 = base64Image.replace(/^data:image\/png;base64,/, "");

//   // Customize your prompt. Note: always use template literals (backticks) for multi-line prompts.
//   const prompt = `
// You are an OCR and translation engine.
// For the provided image of a document page, please:
// 1. Extract all text along with their bounding box coordinates.
// 2. Translate the extracted text from Japanese to English (make it clear, readable, and formatted).
// 3. Return the results as a JSON array in the following format:
//    [
//      {
//        "boundingBox": { "x": number, "y": number, "width": number, "height": number },
//        "translatedText": string
//      },
//      ...
//    ]
//   4. Strictly ordered to only return json (don't do syntax issue)
//   5. don't add extra comma etc . try to not make any syntax issue.
//     `;

//   try {
//     const result = await model.generateContent({
//       contents: [
//         {
//           role: "user",
//           parts: [
//             {
//               inlineData: {
//                 mimeType: "image/png",
//                 data: cleanBase64,
//               },
//             },
//             { text: prompt },
//           ],
//         },
//       ],
//     });
    
//     const rawResponse = await result.response.text(); // Get response text
//     // console.log(responseText);  //contains 3 backticks before and after of the response json array.
//     // Remove triple backticks and any leading/trailing whitespace/newlines:
//  // Sanitize: trim the response and remove any wrapping triple backticks.
//  let sanitized = rawResponse.trim();
//  sanitized = sanitized.replace(/^```[\s\n]*/, "").replace(/```[\s\n]*$/, "");
 
//  // Step 1: Remove garbage before first `[` (in case Gemini gives some explanation before JSON)
//  const firstBracket = sanitized.indexOf("[");
//  if (firstBracket > 0) {
//    sanitized = sanitized.substring(firstBracket);
//  }
 
// // Remove any wrapping triple backticks.
// sanitized = sanitized.replace(/^```[\s\n]*/, "").replace(/```[\s\n]*$/, "");

// // Remove any extra text before the first [ or {.
// const firstBracketIndex = sanitized.search(/[\[\{]/);
// if (firstBracketIndex > 0) {
//   sanitized = sanitized.substring(firstBracketIndex);
// }

// // ***** New robust fix: Replace any occurrence of a comma that is immediately followed by whitespace and one or more commas *****
// sanitized = sanitized.replace(/,\s*,+/g, ',');

// // Also, in case there are more than two commas in a row anywhere:
// sanitized = sanitized.replace(/,{2,}/g, ',');

// // Remove trailing commas before closing braces/brackets.
// sanitized = sanitized.replace(/,\s*(\}|\])/g, '$1');

// // Optional: Remove stray quotes from numeric values.
// sanitized = sanitized.replace(/:\s*(\d+)\s*"/g, ': $1');



 
//  // Optional: handle duplicates in boundingBox if needed (safe but rough)
//  sanitized = sanitized.replace(/"boundingBox"\s*:\s*\{[^}]*?\}/g, (match) => {
//    const seen = new Set();
//    return match.replace(/"(\w+)"\s*:\s*([^,}]+)/g, (m, key, value) => {
//      if (seen.has(key)) return "";
//      seen.add(key);
//      return `"${key}": ${value},`;
//    }).replace(/,\s*\}/g, '}'); // clean up trailing comma
//  });
 
//  console.log("Sanitized response:", sanitized);

//  //gemini can't be believed , it is asked to give response in json(but,it does errors with syntax of json(sometimes)) . 
//  //but, we need to parse the json received from gemini(so , we can extract information from it)
//  //however , json.parse(jsonResponse) strictly needs json (agar ,so called jsonResponsesyntax me issue hai in that json,then error is thrown and our work stop)
 
//  //so,instead of using normal json.parse, we would use -> json5(a package, which converts the response to object even if some syntax issue
//  //is there in the jsonResponse , it is lenient. we only need to  convert josnREsponse  to object , json5 does it easily even if syntax issue hai
//  //jsonResponse me   )
  
    
//     // const parsed = JSON.parse(sanitized);   //can only parse the json (so, sanitized needs to be in json format) ,so ,removed unexpected tokens before the json
//     const parsed = JSON5.parse(sanitized); // way more forgiving
    
//     // Attach page number information
//     console.log("parsed data is ",parsed);
//     return { page: pageNumber, translations: parsed };  //translations is an  array of objects(becoz a page can have multiple texts ,so ,sabka bounding box different) (contains -> information as written in prompt ,ie, each object contains the translated text/string and the bounding box  )
//   } catch (error) {
//     console.error(`Error processing page ${pageNumber} with Gemini:`, error);
//     throw error;
//   }
// }


import { ChatGoogleGenerativeAI } from "@langchain/google-genai"; 
import { GoogleGenerativeAI } from "@google/generative-ai";   //we dont need it in langchain implementation, if normally use karte,then it is needed
import { StructuredOutputParser } from "langchain/output_parsers";

import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
 
export async function processImageWithGemini(base64Image, pageNumber) {
  
  
    // First, validate the input more thoroughly
    if (!base64Image) {
      console.error("base64Image is empty or undefined");
      throw new Error(`Invalid base64Image input: empty or undefined`);
    }
  
 if(typeof base64Image !== "string"  || !base64Image.trim() ){
  console.log("bzkafjkj")
  throw new Error(`Invalid base64Image input: expected a string but received ${typeof base64Image}`);
 }
 var cleanBase64 =''
//  console.log("base64 Image is ", base64Image);

try{
  // Only attempt to clean if it's a string with content
  cleanBase64 = base64Image.startsWith('data:image') 
  ? base64Image.replace(/^data:image\/[^;]+;base64,/, "") 
  : base64Image;
}
catch(e){
  console.log("inside catch")
  console.log("error while cleaning", e.message)
}


  // console.log("clearImage is -> ", cleanBase64)
  console.log("hellow rold ")
  // Define your output schema using Zod
  const outputSchema = z.array(
    z.object({
      boundingBox: z.object({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      translatedText: z.string(),
    })
  );
   console.log('3')
  // Create parser
  const parser = await StructuredOutputParser.fromZodSchema(outputSchema);
  console.log('4')
  // Get format instructions
  const formatInstructions =await parser.getFormatInstructions();
  console.log('5')
  // Setup Gemini with LangChain
 
  let model;
 
 try{
 model =  new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash", 
  apiKey:  "AIzaSyASr_05jizVrzxVFbHjvlvPErdNQ-duIW4" //"AIzaSyBhzSRE-R6LMJvRQRSGQ4n4oZvok0Gjeo8", // Your API key
});
} 
catch(e){
  console.log("inside model ka catch with error ->", e.message);
}
  console.log('6')
  // Prepare your prompt
  const prompt = `
  You are a manga text detector and translator. Analyze this manga page image:
  
  1. Identify all text regions precisely (speech bubbles, narration boxes, sound effects)
  2. For each text region:
     - Report precise bounding box coordinates (x, y, width, height)
     - The coordinates should tightly contain just the text, not the entire bubble
     - Provide accurate translations from Japanese to English
  
  Return a JSON array of objects with this structure:
  [
    {
      "boundingBox": {"x": number, "y": number, "width": number, "height": number},
      "translatedText": "English translation"
    }
  ]
  
  IMPORTANT:
  - Be extremely precise with bounding box coordinates
  - Include ALL text visible on the page
  - For text that appears vertical, maintain the same orientation in the bounding box
  - Text coordinates should be relative to the image dimensions
  -Send english translation in translatedText 
`;
console.log('7')
  try {
    // Process with LangChain
    const result = await model.invoke([
      new HumanMessage({
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${cleanBase64}`,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      }),
    ]);
    console.log('8')
    console.log(result);
    // Parse the response using the structured output parser
    const rawOutput = result.content; // Gemini's output
const cleanedOutput = rawOutput.replace(/```json|```/g, '').trim();
    const parsedOutput = await parser.parse(cleanedOutput);  //Always use -> parser.parse after langchain use. json.parse(result.content) can give error (since, json.parse expects true json content and then parse it., it gives error if result.content is not true json , and since, langchain adds extra layer over true json content (then json.parse can give error))
    console.log("9")
    return { page: pageNumber, translations: parsedOutput };
  } catch (error) {
    console.error(`Error processing page ${pageNumber} with LangChain:`, error);
    throw error;
  }
}
