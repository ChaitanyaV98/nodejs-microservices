import mongoose from "mongoose";
import logger from "./utils/logger.js";
import express from "express";
import helmet from "helmet"; //adds security to http headers
import { RateLimiterRedis } from "rate-limiter-flexible";
import Redis from "ioredis"; //used for caching the data in mem
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import errorHandler from "./middleware/errorHandler.js";
import cors from "cors"; // helps adding security with repsect to browser request
import { connectToRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import router from "./routes/search-routes.js";
import {
  handlePostCreated,
  handlePostDeletd,
} from "./eventHandler/search-event-handler.js";

const app = express();
const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error"));

//create redis client

const redisClient = new Redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient, //Your Redis connection instance
  keyPrefix: "middleware",
  points: 10, //no of requests user can make
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

//Ip based rate limiting for sensitive endpoints
const sensitiveEndpointsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({ success: false, message: "Too many requests" });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

//apply this sensitiveEndpointsLimiter to our routes
app.use("/api/search/posts", sensitiveEndpointsLimiter);

app.use("/api/search", router);

app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    //consume event to get all the posts created in post controller or we can also say this as we are subscribing to posts event
    await consumeEvent("post.created", handlePostCreated);
    await consumeEvent("post.deleted", handlePostDeletd);

    app.listen(PORT, () => {
      logger.info(`search service is running at ${PORT}`);
    });
  } catch (e) {
    logger.error("Failed to start search service");
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
