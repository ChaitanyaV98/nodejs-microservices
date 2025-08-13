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

// consume event functionality
export async function consumeEvent(routingkey, callback) {
  if (!channel) {
    await connectToRabbitMQ();
  }
  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, EXCHANGE_NAME, routingkey);
  channel.consume(q.queue, (msg) => {
    if (msg !== null) {
      const content = JSON.parse(msg.content.toString());
      callback(content);
      channel.ack(msg);
    }
  });
  logger.info(`Subscribed to event: ${routingkey}`);
}
