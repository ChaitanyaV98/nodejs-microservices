import logger from "../utils/logger.js";
import { validateCreatePost } from "../utils/validateSchema.js";
import Post from "../models/Post.js";

export const createPost = async (req, res) => {
  try {
    logger.info("Post Api endpoint hit");
    const { error } = validateCreatePost(req.body);

    if (error) {
      logger.warn("Registation Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });
    await newlyCreatedPost.save();

    logger.info("Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (error) {
    logger.error("Error creating post", error);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error getting posts", error);
    res.status(500).json({
      success: false,
      message: "Internal server error when fetching posts",
    });
  }
};

export const deletePost = async (req, res) => {
  try {
  } catch (error) {
    logger.error("Error when DELETING posts", error);
    res.status(500).json({
      success: false,
      message: "Internal server error when DELETING post ",
    });
  }
};
