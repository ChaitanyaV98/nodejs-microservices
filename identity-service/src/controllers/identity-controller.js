import logger from "../utils/logger.js";
import { validateRegistrationSchema } from "../utils/validateSchema.js";
import User from "../models/User.js";
import generateTokens from "../utils/generateToken.js";
//user registration

export const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    //validate schema

    const { error } = validateRegistrationSchema(req.body);

    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, username } = req.body;

    let user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (user) {
      logger.warn("User already exists", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.err("Registration error occured", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//user login

//refresh token
{
  /*
    1. we need to create a model for our refresh token because every time the user register we are 
    going to create a refresh token.
    2. lets say we r going to save this token for 7 days
    3. refresh token is required whenever user logs out from db

*/
}

//logout
