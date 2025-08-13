import { uploadMediaToCloudinary } from "../utils/cloudinary.js";
import logger from "../utils/logger.js";
import Media from "../models/media.js";

export const uploadMedia = async (req, res) => {
  try {
    console.log("request file---", req.file);
    if (!req.file) {
      console.log("No file found! please add a file and try again");
      return res.status(400).json({
        success: false,
        message: "No File found! please try again",
      });
    }
    const { originalname, mimetype, buffer } = req.file;
    const userId = req.user.userId;
    logger.info(`File details: name= ${originalname}, type=${mimetype} `);
    logger.info("Uploading to cloudinary starting...");
    const cloudinaryUploadResult = await uploadMediaToCloudinary(req.file);

    logger.info(
      `cloudinary upload successfull. public id = ${cloudinaryUploadResult?.public_id}`
    );

    const newlyCreatedMedia = new Media({
      publicId: cloudinaryUploadResult?.public_id,
      originalName: originalname,
      mimeType: mimetype,
      url: cloudinaryUploadResult?.secure_url,
      userId,
    });

    console.log("newlyCreatedMedia", newlyCreatedMedia);
    await newlyCreatedMedia.save();

    res.status(201).json({
      success: true,
      mediaId: newlyCreatedMedia._id,
      url: newlyCreatedMedia.url,
      message: "Media is uploaded successfully",
    });
  } catch (e) {
    logger.info("Error while upload Media", e);
    res.status(500).json({
      success: false,
      message: "Error while upload Media",
    });
  }
};

export const getAllMedia = async (req, res) => {
  try {
    const results = await Media.find({});
    res.json({ results });
  } catch (e) {
    logger.info("Error while fetching all  Media", e);
    res.status(500).json({
      success: false,
      message: "error while fetching media",
    });
  }
};
