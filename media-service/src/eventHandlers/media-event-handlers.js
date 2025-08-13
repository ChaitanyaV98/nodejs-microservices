import Media from "../models/media.js";
import { deleteMediaFromCloudinary } from "../utils/cloudinary.js";

export const handlePostDeleted = async (event) => {
  console.log(event, "eventeventevent");
  // whenever we delete a post then publish event happens and consume event happens in
  const { postId, mediaIds } = event;
  try {
    const mediaToDelete = await Media.find({ _id: { $in: mediaIds } });

    for (const media of mediaToDelete) {
      await deleteMediaFromCloudinary(media.publicId); //delete from cloudinary
      await Media.findByIdAndDelete(media._id); //delete from mongodb database
      logger.info(
        `Deleted medua ${media._id} associated with this deleted post ${postId}`
      );
    }
    logger.info(`Processed/completed deletion of media for post id ${postId}`);
  } catch (err) {
    logger.error("Error occured while media deletion");
  }
};
