import logger from "../utils/logger.js";
import { validateCreatePost } from "../utils/validateSchema.js";
import Post from "../models/Post.js";

// async function invalidatePostCache(req, res) {
//   const keys = await req.redisClient.keys("posts:*");
//   if (keys.length > 0) {
//     await req.redisClient.del(keys);
//   }
// }

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
    await req.redisClient.setex(cacheKey, 300, JSON.stringify(result));

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
    const cachedPost = await req.redisClient.get(cachekey);

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
    const post = await Post.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!post) {
      return res.status(404).json({
        message: "Post not found",
        success: false,
      });
    }

    //publish post delete method ->
    await publishEvent("post.deleted", {
      postId: post._id.toString(),
      userId: req.user.userId,
      mediaIds: post.mediaIds,
    });

    await invalidatePostCache(req, req.params.id);
    res.json({
      message: "Post deleted successfully",
    });
  } catch (e) {
    logger.error("Error deleting post", error);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};
