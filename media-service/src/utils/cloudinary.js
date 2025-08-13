// import { v2 as cloudinary } from "cloudinary";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET, // Click 'View API Keys' above to copy your API secret
// });
// //this will upload media(file buffer from memory) to cloudinary
// //Uses upload_stream, which lets you pipe or stream data directly to Cloudinary without writing it to disk.
// //resource_type: "auto" means it detects file type automatically (image, video, raw file).

// // Efficient for streaming uploads — useful in:

// // 1. APIs receiving files directly (e.g., React form uploads)

// // 2. Serverless functions (e.g., AWS Lambda) where you don’t want to store files locally

// // 3. Large files that you want to send while they’re still being received

// //cons: Memory usage can spike for large files
// const uploadMediaToCloudinary = (file) => {
//   return new Promise((resolve, reject) => {
//     const uploadStream = cloudinary.uploader.upload_stream(
//       {
//         resource_type: "auto",
//       },
//       (error, result) => {
//         if (error) {
//           logger.error("Error while uploading media to cloudinary", error);
//           reject(error);
//         } else {
//           resolve(result);
//         }
//       }
//     );

//     uploadStream.end(file.buffer);
//   });
// };

// export default uploadMediaToCloudinary;

import { v2 as cloudinary } from "cloudinary";
import logger from "./logger.js"; // Adjust path if needed

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Function to upload file buffer to Cloudinary using upload_stream
export const uploadMediaToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "auto", // auto-detect file type (image, video, raw)
        },
        (error, result) => {
          if (error) {
            logger.error("Cloudinary upload error:", error);
            reject(error);
          } else {
            logger.info("Cloudinary upload successful", result);
            resolve(result);
          }
        }
      );

      // Send the buffer to Cloudinary via the stream
      uploadStream.end(file.buffer);
    } catch (err) {
      logger.error("Upload stream error:", err);
      reject(err);
    }
  });
};

export const deleteMediaFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Media deleted successfully from our cloud storage", publicId);
    return result;
  } catch (e) {
    logger.error("Error while deleting media from cloudinary", e);
    throw e;
  }
};
