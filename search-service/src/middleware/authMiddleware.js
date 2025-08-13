import logger from "../utils/logger.js";

export const authenticateRequest = (req, res, next) => {
  //getting userId from our headers
  const userId = req.headers["x-user-id"]; // x-user-id we will be getting from api gateway

  if (!userId) {
    logger.warn("Access attempted without user id");
    return res.status(401).json({
      success: false,
      message: "Authentication required! Please login to continue.",
    });
  }

  req.user = { userId };
  next();
};
