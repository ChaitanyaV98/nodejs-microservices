import logger from "../utils/logger.js";
import jwt from "jsonwebtoken";

export const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    logger.warn("Access attempt without token");
    return res.status(401).json({
      success: false,
      message: "Access Denied. No token provided",
    });
  }

  //decrypt user infor using the token
  try {
    console.log("In try block", token);
    const user = jwt.verify(token, process.env.JWT_SECRET);
    console.log("User---", user);
    req.user = user;
    next();
  } catch (error) {
    console.error("JWT Verification Error:", error);
    return res.status(403).json({
      success: false,
      message: "Internal server error while decryping token",
    });
  }
};
