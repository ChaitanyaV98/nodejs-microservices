import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// understandinf: When you insert a refresh token with an expiresAt timestamp (e.g., 30 days from now),

//MongoDB automatically deletes it as soon as that time is hit — no manual cleanup needed!

// example : {
//   token: "abc123",
//   user: ObjectId("..."),
//   expiresAt: "2025-08-16T10:00:00Z"
// }

//At "2025-08-16T10:00:00Z", MongoDB will remove this document automatically.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model("refreshToken", refreshTokenSchema);

export default RefreshToken;
