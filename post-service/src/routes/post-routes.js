import express from "express";
import logger from "../utils/logger.js";
import { authenticateRequest } from "../middleware/authMiddleware.js";
import { createPost, getAllPosts } from "../controllers/post-controller.js";

const router = express.Router();

router.post("/create-post", authenticateRequest, createPost);
router.get("/all-posts", authenticateRequest, getAllPosts);

export default router;
