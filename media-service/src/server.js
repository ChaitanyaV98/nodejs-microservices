import express from "express";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import helmet from "helmet"; //adds security to http headers
import { RateLimiterRedis } from "rate-limiter-flexible"; //used to limit no.of requests in particular time limit
import Redis from "ioredis"; //used for caching the data in mem
import { RedisStore } from "rate-limit-redis";
import { rateLimit } from "express-rate-limit";
import errorHandler from "./middleware/errorHandler.js";
import cors from "cors";
import router from "./routes/media-routes.js";
import { connectToRabbitMQ, consumeEvent } from "./utils/rabbitmq.js";
import { handlePostDeleted } from "./eventHandlers/media-event-handlers.js";

const app = express();
const PORT = process.env.PORT || 3003;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Media service Connected to mongodb"))
  .catch((e) => logger.error("Mongo connection error", e));

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
app.use("/api/media/upload", sensitiveEndpointsLimiter);

app.use("/api/media", router);

//error handler
app.use(errorHandler);

async function startServer() {
  try {
    await connectToRabbitMQ();
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      console.log(`media service is running at ${PORT}`);
      logger.info(`media service is running at ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to server");
    process.exit(1);
  }
}

//start server
startServer(); //here we connect to rabbit mq and start our server

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at", promise, "reason:", reason);
});
