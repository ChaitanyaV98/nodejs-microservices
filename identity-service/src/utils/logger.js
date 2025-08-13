import winston from "winston";
const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "identity-service" },

  //trnasport specifies the output destination
  transports: [
    new winston.transports.Console({
      // all the logs that we are having, we will get those in our console
      format: winston.format.combine(
        winston.format.colorize(), // format for colorizing
        winston.format.simple()
      ),
    }),
    new winston.transports.File({ filename: "error.log", level: "error" }), //the error logs will also come in a file
    new winston.transports.File({ filename: "combined.log" }), // all the logs in this file
  ],
});

export default logger;
