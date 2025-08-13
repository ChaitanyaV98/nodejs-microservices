import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    mediaIds: [
      {
        type: String,
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// this is the database indexing that we are creating.
//we are creating indexing on content -  so if we want to search then we can search on this content.
postSchema.index({ content: "text" });

const Post = mongoose.model("Post", postSchema);

export default Post;
