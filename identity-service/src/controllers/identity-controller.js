import logger from "../utils/logger.js";
import {
  validateRegistrationSchema,
  validatelogin,
} from "../utils/validateSchema.js";
import User from "../models/User.js";
import generateTokens from "../utils/generateToken.js";
import RefreshToken from "../models/RefreshToken.js";
//user registration

export const registerUser = async (req, res) => {
  logger.info("Registration endpoint hit...");
  try {
    //validate schema

    const { error } = validateRegistrationSchema(req.body);

    if (error) {
      logger.warn("Registation Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password, username } = req.body;
    // query to check if the user is there or not
    let user = await User.findOne({
      $or: [{ username }, { email }],
    });
    if (user) {
      logger.warn("User already exists", `Email or username already taken`);
      return res.status(400).json({
        success: false,
        message: "Email or username already taken",
      });
    }

    user = new User({ username, email, password });
    await user.save();
    logger.warn("User saved successfully", user._id);

    // we are generating tokens here itself because after user registers we dont force user to login again

    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(201).json({
      success: true,
      message: "User registered successfully!",
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error("Registration error occured", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//user login
export const loginUser = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    //validate
    const { error } = validatelogin(req.body);
    if (error) {
      logger.warn("Login Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid user");
      return res.status(400).json({
        success: false,
        message: "Invalid user ",
      });
    }
    //check if the password is correct or not using comparePassword func in User mode
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }
    const { accessToken, refreshToken } = await generateTokens(user);

    res.status(200).json({
      accessToken,
      refreshToken,
      userId: user._id, //we will get from mongo db
    });
  } catch (error) {
    logger.error("Registration error occured", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
//refresh token

{
  /*
    1. we need to create a model for our refresh token because every time the user register we are 
    going to create a refresh token.
    2. lets say we r going to save this token for 7 days
    3. refresh token is required whenever user logs out from db
4. apart from creating and saving the refresh for 7 days, we also need to create and endpoint so that we will also be able to generate tokens when hitting this api


why are we implementing this?


This refresh token is:

Stored by the client (e.g., in cookies, localStorage, or memory)
Used when the access token expires (because access tokens are short-lived)

Sent to the server (your /refresh endpoint) to get:

a new access token (for authenticated API calls)

a new refresh token (to replace the old one — rotation)
adds security benifits
*/
}

export const refreshTokenUser = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    //get old refresh token as payload
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    //fetch the token from db
    const storedToken = await RefreshToken.findOne({ token: refreshToken });
    if (!storedToken) {
      logger.warn("Invalid refresh token provided");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }

    //fetch the user details using the old token
    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("User not found");

      return res.status(401).json({
        success: false,
        message: `User not found`,
      });
    }
    //generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    //delete the old refresh token-very importnant
    await RefreshToken.deleteOne({ _id: storedToken._id });
    //send the new access token and refresh token in the response
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error("error occured while generating tokens", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//logout

export const logoutUser = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    // whenever we logout we need to delete refresh token from our db
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }
    await RefreshToken.deleteOne({ token: refreshToken });
    logger.info("Refresh Token deleted for logout");

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    logger.error("error occured while logout", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
