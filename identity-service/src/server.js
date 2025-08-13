import mongoose from "mongoose";
import logger from "./utils/logger.js";
import express from "express";
import helmet from "helmet"; //adds security to http headers
import { RateLimiterRedis } from "rate-limiter-flexible"; // counts and limits no.of actions by key and protects from DDoS and brute force attack at any scale
import Redis from "ioredis";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import router from "./routes/identity-service.js";
import errorHandler from "./middleware/errorHandler.js";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3001;

//connect to db
mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

//create redis client
const redisClient = new Redis(process.env.REDIS_URL);

//add middlewares

app.use(helmet());
app.use(cors());
app.use(express.json());

// added custom middleware for showing up the logs of request
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//basic rate-limiting for ddos(Distributed Denial of Service) protection
// DDoS: It’s a cyberattack where multiple systems flood a target (like a website or server) with too much traffic, causes system slow down, crash or becomes completely inaccessible for real users
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, //Your Redis connection instance
  keyPrefix: "middleware", // this is the prefix that is added to redis client for rate limiting
  points: 5, //no of requests user can make
  duration: 1, //in 1 sec user can make 10 requests
});

//middleware to check no.of requests
app.use((req, res, next) => {
  rateLimiter
    .consume(req.ip)
    .then(() => next())
    .catch(() => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
      res.status(429).json({ success: false, message: "Too many requests" });
    });
});

//Ip based rate limiting for sensitive endpoints - a user can access register end point only 10 times, >10 times then block for sometime
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // 50 requests within 15 min
  standardHeaders: true, // whether u want to iclude the rate limit for responses or not, true here
  legacyHeaders: false, // we dont want to include any legacy headers
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply this sensitiveEndpointsLimiter to our routes
app.use("/api/auth/register", sensitiveEndpointsLimiter);

//Routes
app.use("/api/auth", router);

//error handler
app.use(errorHandler);

//start server
app.listen(PORT, () => {
  logger.info(`identity service is running at ${PORT}`);
});

//unhandled promise rejection

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
