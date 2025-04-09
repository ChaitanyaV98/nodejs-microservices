import express from "express";
import { authenticateRequest } from "../middleware/authMiddleware.js";
import {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} from "../controllers/post-controller.js";

const router = express.Router();

router.post("/create-post", authenticateRequest, createPost);
router.get("/all-posts", authenticateRequest, getAllPosts);
router.get("/single-post", authenticateRequest, getPost);
router.get("/delete-post", authenticateRequest, deletePost);

export default router;
