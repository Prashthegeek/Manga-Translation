// upload.js
//2nd step of cloudinary + multer setup ,here we are making multer to use cloudinary as storage instead of diskStorage (which saves files locally)
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

// Set up CloudinaryStorage to save files under a folder named "manga"
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
      // Check the mimetype of the file to decide the resource type.
      // If it's a PDF, use 'raw'; otherwise, let Cloudinary auto-detect.
      let resourceType = file.mimetype === 'application/pdf' ? 'raw' : 'auto';

      return {
        folder: "manga", // Save all files in the 'manga' folder
        resource_type: resourceType,
        public_id: file.originalname.split('.')[0] + "-" + Date.now() , // Unique file name
      };
    },
  });

const upload = multer({ storage: storage });   //if diskStorage use karte ,then locally save karta, but, want to save it on cloudinary.

export default upload;
