import logger from "../utils/logger.js";
import Search from "../models/Search.js";

export async function handlePostCreated(event) {
  try {
    console.log("EVENT----", event);

    // Destructure the event object
    const { postId, userId, content, createdAt } = event;

    const newSearchPost = new Search({
      postId,
      userId,
      content,
      createdAt,
    });

    await newSearchPost.save();

    logger.info(
      `search post created successfully: ${postId}, ${newSearchPost._id.toString()}`
    );
  } catch (e) {
    logger.error("Error occured during post creation event", e);
  }
}

export async function handlePostDeletd(event) {
  try {
    await Search.findOneAndDelete({ postId: event.postId });
    logger.info(`search post deleted successfully: ${postId}}`);
  } catch (e) {
    logger.error("Error occured during post deletion event", e);
  }
}
