import logger from "../utils/logger.js";
import { validateCreatePost } from "../utils/validateSchema.js";
import Post from "../models/Post.js";
import mongoose from "mongoose";
import { publishEvent } from "../utils/rabbitmq.js";

//whenever we create a new post we need to invalidate the cache, cz whenever we fetch the posts we will only getting posts from cacje
async function invalidatePostCache(req, input) {
  const cachedKey = `post:${input}`;
  await req.redisClient.del(cachedKey);

  const keys = await req.redisClient.keys("posts:*");
  if (keys.length > 0) {
    await req.redisClient.del(keys);
  }
}

export const createPost = async (req, res) => {
  try {
    logger.info("create post Api endpoint hit");
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

    //publish an event so that we can consume the posts in search and we can keep the search functionality separate
    await publishEvent("post.created", {
      postId: newlyCreatedPost._id.toString(),
      userId: newlyCreatedPost.user.toString(),
      content: newlyCreatedPost.content,
      createdAt: newlyCreatedPost.createdAt,
    });

    //invalidate
    await invalidatePostCache(req, newlyCreatedPost._id.toString());
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

//for getAllPosts and getPosts we also need to implement caching for which in server.js we will make routes to pass via a middleware
export const getAllPosts = async (req, res) => {
  try {
    logger.info("Get All posts API hit");
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    //Caching mechanism- avoid hitting the database every time a user fetches the same page of posts.
    const cacheKey = `posts:${page}:${limit}`;
    const cachedPosts = await req.redisClient.get(cacheKey); //If this returns a value, it means we've already fetched and stored the result earlier, so no need to hit the database again.
    if (cachedPosts) {
      return res.json(JSON.parse(cachedPosts));
    }
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    const totalNoOfPosts = await Post.countDocuments();

    const result = {
      posts,
      currentpage: page,
      totalPages: Math.ceil(totalNoOfPosts / limit),
      totalPosts: totalNoOfPosts,
    };

    //save your posts in redis cache
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result)); // cache the data for 5min

    res.json(result);
  } catch (error) {
    logger.error("Error getting posts", error);
    res.status(500).json({
      success: false,
      message: "Internal server error when fetching posts",
    });
  }
};

export const getPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const cachekey = `post:${postId}`;
    const cachedPost = await req.redisClient.get(cachekey); // check if th post is already in the cache

    if (cachedPost) {
      return res.json(JSON.parse(cachedPost));
    }

    const singlePostDetailsbyId = await Post.findById(postId);

    if (!singlePostDetailsbyId) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    await req.redisClient.setex(
      cachedPost,
      3600,
      JSON.stringify(singlePostDetailsbyId)
    );

    res.json(singlePostDetailsbyId);
  } catch (e) {
    logger.error("Error fetching post", error);
    res.status(500).json({
      success: false,
      message: "Error fetching post by ID",
    });
  }
};

export const deletePost = async (req, res) => {
  try {
    console.log("=== DELETE POST DEBUG ===");
    console.log("user ID:", req.user.userId);
    console.log("post ID:", req.params.id);
    console.log("user ID type:", typeof req.user.userId);
    console.log("post ID type:", typeof req.params.id);

    // First, find the post to see its structure
    const postExists = await Post.findById(req.params.id);
    console.log("Post exists check:", postExists);

    if (!postExists) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    // Debug the user comparison
    console.log("Post user ID:", postExists.user);
    console.log("Post user ID toString():", postExists.user.toString());
    console.log("Current user ID:", req.user.userId);
    console.log(
      "Do they match?",
      postExists.user.toString() === req.user.userId
    );

    // Check if user owns the post
    if (postExists.user.toString() !== req.user.userId) {
      return res.status(403).json({
        message: "Not authorized to delete this post",
        success: false,
      });
    }

    console.log("=== ATTEMPTING DELETE ===");

    // Try different approaches to delete
    console.log("Approach 1: Using string IDs");
    const post1 = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });
    console.log("Result 1:", post1 ? "SUCCESS" : "FAILED");

    if (post1) {
      console.log("Successfully deleted with string IDs");
      // Continue with cleanup...
      await publishEvent("post.deleted", {
        postId: post1._id.toString(),
        userId: req.user.userId,
        mediaIds: post1.mediaIds,
      });

      await invalidatePostCache(req, req.params.id);

      return res.json({
        message: "Post deleted successfully",
        success: true,
      });
    }

    console.log("Approach 2: Using ObjectId conversion");
    const post2 = await Post.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(req.params.id),
      user: new mongoose.Types.ObjectId(req.user.userId),
    });
    console.log("Result 2:", post2 ? "SUCCESS" : "FAILED");

    if (post2) {
      console.log("Successfully deleted with ObjectId conversion");
      // Continue with cleanup...
      await publishEvent("post.deleted", {
        postId: post2._id.toString(),
        userId: req.user.userId,
        mediaIds: post2.mediaIds,
      });

      await invalidatePostCache(req, req.params.id);

      return res.json({
        message: "Post deleted successfully",
        success: true,
      });
    }

    console.log(
      "Approach 3: Delete by ID only (since we already verified ownership)"
    );
    const post3 = await Post.findByIdAndDelete(req.params.id);
    console.log("Result 3:", post3 ? "SUCCESS" : "FAILED");

    if (post3) {
      console.log("Successfully deleted with findByIdAndDelete");
      // Continue with cleanup...
      await publishEvent("post.deleted", {
        postId: post3._id.toString(),
        userId: req.user.userId,
        mediaIds: post3.mediaIds,
      });

      await invalidatePostCache(req, req.params.id);

      return res.json({
        message: "Post deleted successfully",
        success: true,
      });
    }

    // If all approaches fail
    return res.status(500).json({
      message: "Failed to delete post despite verification",
      success: false,
    });
  } catch (e) {
    logger.error("Error deleting post", e);
    console.log("DELETE ERROR:", e);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};
