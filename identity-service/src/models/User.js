import mongoose from "mongoose";
import argon2 from "argon2";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
  },
  { timestamps: true }
);

//middleware
//This is called a Mongoose "pre-save hook". It runs just before a document is saved to the MongoDB database.
userSchema.pre("save", async function (next) {
  //gets triggered when .save() method is called in controller
  if (this.isModified("password")) {
    //checks if the password is new or changed
    try {
      this.password = await argon2.hash(this.password); // If hashing succeeds → async function completes → Mongoose proceeds (next() is implied)
    } catch (error) {
      console.log("Error ", error);
      return next(error);
    }
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await argon2.verify(this.password, candidatePassword);
  } catch (error) {
    throw error;
  }
};

//if you want to implement search on this username
userSchema.index({ username: "text" });

const User = mongoose.model("User", userSchema);

export default User;
