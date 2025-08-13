import amqp from "amqplib";
import logger from "./logger.js";

let connection = null;

let channel = null;

const EXCHANGE_NAME = "facebook_events"; //this is a social application and we need to use unique exchange_name

export async function connectToRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (e) {
    logger.error("Error when connecting to rabbit mq", e);
  }
}

//now that we have created a connection to rabbitMq but now we need to make use of this of this connection, which is done server.js startServer function

//publish an event when we delete a post

//this function is used when we do delete post method in post controller

export async function publishEvent(routingKey, message) {
  if (!channel) {
    await connectToRabbitMQ();
  }

  channel.publish(
    EXCHANGE_NAME,
    routingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event published: ${routingKey}`);
}
