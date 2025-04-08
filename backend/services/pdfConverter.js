// pdfConverter.js
import { fromPath } from "pdf2pic";
import path from "path";

export async function convertPDFToImages(pdfPath) {
  const options = {
    density: 100,             // Dots per inch
    saveFilename: "page",     // Base name for output images
    savePath: path.dirname(pdfPath), // Output folder (same as PDF by default)
    format: "png",            // Output format
    width: 800,               // Image width in pixels
    height: 1200              // Optional
  };

  // Initialize pdf2pic with the given options
  const pdf2pic = fromPath(pdfPath, options);

  // We need to know how many pages are in the PDF. 
  // pdf2pic doesn't provide a direct method to get total pages,
  // so we do a trick: call convert() with -1 to convert all pages.
  // It returns an array of results (one per page).
  const allPages = await pdf2pic(-1);

  // Each item in allPages has { page, name, path }
  // "path" is the absolute path to the generated PNG file
  return allPages.map(item => item.path);
}
