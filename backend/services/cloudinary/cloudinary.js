// cloudinary.js
//1st step for cloudinary setuup. 
import { v2 as cloudinary } from "cloudinary";

// Configure your Cloudinary credentials (find these in your Cloudinary Dashboard)
cloudinary.config({
  cloud_name: "dkyhpc8fx",
  api_key: "828436936245985",
  api_secret: "0dvDMIo7yeVg4tYFZHge16-m2io",
});

export default cloudinary;
