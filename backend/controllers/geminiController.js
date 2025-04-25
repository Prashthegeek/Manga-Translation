import { processImageWithGemini } from "../ocr.js";

export async function processAllPages(base64Images){
    const results = [];  //array of objects , each object contains page number and translations(array which contains translated text and bounding box)
    //base64Images is an array (contains images in base64 format);
    for(let i = 0 ;i<base64Images.length ;i++){
        console.log(`sending page ${i+1} to gemini`);
        const pageResult =  await processImageWithGemini(base64Images[i] , i+1);
        results.push(pageResult);  //pageResult contains an object -> each object contains -> page number and an array of objects(name of array is translations ), each object of translations array contains ->translated text and bounding box of each text 
    } 
    return results;  //so, results is an array of objects 
}