// kafka-test.js
import { Kafka } from 'kafkajs';

async function run() {
  const kafka = new Kafka({ brokers: ["${KAFKA_BROKER}"] });
  const producer = kafka.producer();
  await producer.connect();
  await producer.send({
    topic: 'test-topic',
    messages: [{ value: 'Hello from NextJS!' }],
  });
  console.log("Message sent from NextJS");
  await producer.disconnect();
}

run().catch(console.error);
