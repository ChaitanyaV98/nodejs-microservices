import express from "express";
import { authenticateRequest } from "../middleware/authMiddleware.js";
import {
  createPost,
  getAllPosts,
  getPost,
  deletePost,
} from "../controllers/post-controller.js";

const router = express.Router();
//here authenticateRequest method is used to tell if the user is an auth user or not
router.post("/create-post", authenticateRequest, createPost);
router.get("/all-posts", authenticateRequest, getAllPosts);
router.get("/single-post/:id", authenticateRequest, getPost);
router.delete("/:id", authenticateRequest, deletePost);

export default router;
