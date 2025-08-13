import express from "express";
import multer from "multer";
import { uploadMedia, getAllMedia } from "../controllers/media-controller.js";
import { authenticateRequest } from "../middleware/authMiddleware.js";

const router = express.Router();

//configure multer for file storage - the below function automatically creates util for multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
}).single("file");

router.post(
  "/upload",
  authenticateRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error("Multer error while uploading", err);
        return res.status(400).json({
          message: "multer error while uploading",
          error: err.message,
          stack: err.stack,
        });
      } else if (err) {
        logger.error("unknown error while uploading", err);
        return res.status(500).json({
          message: "Unknown error occured while uploading",
          error: err.message,
          stack: err.stack,
        });
      }
      if (!req.file) {
        logger.error("No file found");

        return res.status(400).json({
          message: "No file found",
        });
      }
      next();
    });
  },
  uploadMedia
);

router.get("/get", authenticateRequest, getAllMedia);

export default router;
