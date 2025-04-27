// import { processImageWithGemini } from "../ocr.js";

// export async function processAllPages(base64Images){
//     const results = [];  //array of objects , each object contains page number and translations(array which contains translated text and bounding box)
//     //base64Images is an array (contains images in base64 format);
//     for(let i = 0 ;i<base64Images.length ;i++){
//         console.log(`sending page ${i+1} to gemini`);
//         const pageResult =  await processImageWithGemini(base64Images[i] , i+1);
//         results.push(pageResult);  //pageResult contains an object -> each object contains -> page number and an array of objects(name of array is translations ), each object of translations array contains ->translated text and bounding box of each text 
//     } 
//     return results;  //so, results is an array of objects 
// }




import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredOutputParser } from "langchain/output_parsers";
import { HumanMessage } from "@langchain/core/messages";
import { z } from "zod";

// Process a single image
export async function processImageWithGemini(base64Image, pageNumber) {
  // Validate input
  if (!base64Image || typeof base64Image !== "string" || !base64Image.trim()) {
    console.error("Invalid base64Image input");
    throw new Error(`Invalid base64Image input: ${base64Image ? typeof base64Image : 'empty'}`);
  }

  // Clean base64 string if needed
  const cleanBase64 = base64Image.startsWith('data:image') 
    ? base64Image.replace(/^data:image\/[^;]+;base64,/, "") 
    : base64Image;


  // Define output schema using Zod
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
  
  // Create parser
  const parser = StructuredOutputParser.fromZodSchema(outputSchema);
  
  try {
    // Setup Gemini model
    const model = new ChatGoogleGenerativeAI({
      model: "gemini-2.0-flash",
      apiKey:  "AIzaSyASr_05jizVrzxVFbHjvlvPErdNQ-duIW4",
      maxOutputTokens: 2048, // Ensure enough tokens for detailed responses
      temperature: 0.2, // Lower temperature for more focused responses
    });
    
    console.log("after gemini model")
    // Improved prompt for more reliable text detection and translation
    const prompt = `
    You are a manga/comic text detector and translator specialized in Japanese to English translations.

INSTRUCTIONS:
1. Identify ALL text in the image (speech bubbles, narration, sound effects, signs)
2. Provide ACCURATE English translations (not the original Japanese text)
3. Return precise bounding box coordinates

FORMAT REQUIREMENTS (CRITICAL):
You MUST return your response as a valid JSON array with EXACTLY this structure:
[
  {
    "boundingBox": {
      "x": number,      // left position (numeric value only)
      "y": number,      // top position (numeric value only)
      "width": number,  // width of text area (numeric value only)
      "height": number  // height of text area (numeric value only)
    },
    "translatedText": "English translation here"  // MUST be in English, never Japanese
  },
  // additional entries follow the same structure
]

IMPORTANT GUIDELINES FOR ACCURACY:
- Double-check that ALL text is translated to English
- For bounding boxes: measure against the image dimensions precisely
- Include ONLY the keys shown above - no additional fields
- Do not include any explanation text outside the JSON
- Verify your JSON structure is valid before returning  (please , and correct it also)
-The coordinates should be numbers relative to the image dimensions, with (0,0) at the top-left corner.
    `;
    
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
    
    // Extract text content from result
  
    const rawOutput = result.content;
    console.log('rawOutput is ', rawOutput)
    

    // Clean result (remove markdown code blocks if present)
    let cleanedOutput = rawOutput.replace(/```json|```/g, '').trim();

    console.log("cleanedOUtput is " , cleanedOutput)
    
    // Handle potential JSON issues
    try {
      // Try parsing directly if it's already JSON
      const jsonOutput = JSON.parse(cleanedOutput);
      return { page: pageNumber, translations: jsonOutput };
    } catch (parseError) {
      // If direct parsing fails, use the structured parser
      try {
        const parsedOutput = await parser.parse(cleanedOutput);
        return { page: pageNumber, translations: parsedOutput };
      } catch (structuredParseError) {
        console.error(`Error parsing page ${pageNumber} output:`, structuredParseError);
        // Return empty translations as fallback
        return { page: pageNumber, translations: [] };
      }
    }
  } catch (error) {
    console.error(`Error processing page ${pageNumber}:`, error);
    // Returning empty result rather than throwing to prevent complete failure
    return { page: pageNumber, translations: [] };
  }
}

// Process all pages
export async function processAllPages(base64Images) {
  console.log(`Processing ${base64Images.length} pages...`);
  
  const results = [];
  // Process in smaller batches to avoid memory issues and rate limits
  const batchSize = 2;
  
  for (let i = 0; i < base64Images.length; i += batchSize) {
    console.log(`Processing batch starting at page ${i+1}`);
    const batch = base64Images.slice(i, i + batchSize);
    const batchPromises = batch.map((base64, idx) => 
      processImageWithGemini(base64, i + idx + 1)
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