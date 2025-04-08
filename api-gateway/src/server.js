import express from "express";
import cors from "cors";
import Redis from "ioredis";
import helmet from "helmet";
import logger from "./utils/logger.js";
import proxy from "express-http-proxy";
import errorHandler from "./middleware/errorHandler.js";
import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import url from "url";
import { validateToken } from "./middleware/authMiddleware.js";

const app = express();

const PORT = process.env.PORT;
const redisClient = new Redis(process.env.REDIS_URL);

//add middlewares

app.use(helmet());
app.use(cors());
app.use(express.json());

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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

app.use(rateLimiter);

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body, ${req.body}`);
  next();
});

//creating a proxy: whenver we are calling an api of a server with some , we redirect to the route of other service running on differnt port
//for ex when we wanna call localhost:3000/api/v1/auth/register it will target localhost:3001/api/auth/register

const proxyOptions = {
  proxyReqOptDecorator: (req) => {
    const resolvedPath = req.originalUrl.replace(/^\/v1/, "/api");
    return resolvedPath;
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: `Inter server error`,
      error: err.message,
    });
  },
};

//setting up proxy for our identity services

// app.use(
//   "/v1/auth",
//   proxy(process.env.IDENTITY_SERVICE_URL, {
//     ...proxyOptions,
//     proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
//       proxyReqOpts.headers["Content-Type"] = "application/json";
//       return proxyReqOpts;
//     },
//     userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
//       logger.info(
//         `Response received from Identity service: ${proxyRes.statusCode}`
//       );
//       return proxyResData;
//     },
//   })
// );
app.use(
  "/v1/auth",
  proxy(process.env.IDENTITY_SERVICE_URL, {
    // 👇 THIS is the correct path rewiring method
    proxyReqPathResolver: (req) => {
      const resolvedPath = req.originalUrl.replace(/^\/v1/, "/api");
      return url.parse(resolvedPath).path;
    },

    // Optional: Set JSON header
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["Content-Type"] = "application/json";
      return proxyReqOpts;
    },

    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from Identity service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },

    proxyErrorHandler: (err, res, next) => {
      logger.error(`Proxy error in identity service: ${err.message}`);
      res.status(500).json({
        message: `Internal server error`,
        error: err.message,
      });
    },
  })
);

//setting up proxy for our post services
app.use(
  "/v1/posts",
  validateToken,
  proxy(process.env.POST_SERVICE_URL, {
    // proxyReqPathResolver: (req) => {
    //   const resolvedPath = req.originalUrl.replace(/^\/v1/, "/api");
    //   return url.parse(resolvedPath).path;
    // },

    proxyReqPathResolver: (req) => {
      const resolvedPath = req.originalUrl.replace(/^\/v1/, "/api");
      logger.info(`Proxying request to: ${resolvedPath}`);
      return resolvedPath;
    },
    // Optional: Set JSON header
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      logger.info(
        `Forwarded to path: ${srcReq.originalUrl} → ${
          url.parse(srcReq.originalUrl.replace(/^\/v1/, "/api")).path
        }`
      );
      proxyReqOpts.headers["Content-Type"] = "application/json";
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      return proxyReqOpts;
    },
    userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
      logger.info(
        `Response received from post service: ${proxyRes.statusCode}`
      );
      return proxyResData;
    },

    proxyErrorHandler: (err, res, next) => {
      logger.error(`Proxy error in logger: ${err.message}`);
      res.status(500).json({
        message: `Internal server error`,
        error: err.message,
      });
    },
  })
);

//error handling
app.use(errorHandler);

//start server
app.listen(PORT, () => {
  logger.info(`API Gateway is running at ${PORT}`);
  logger.info(
    `Identity service is running at ${process.env.IDENTITY_SERVICE_URL}`
  );
  logger.info(`post service is running at ${process.env.POST_SERVICE_URL}`);
});
