/**
 * Example: Kafka Producer Usage
 * This example demonstrates recommended patterns for using Kafka in Next.js.
 * 
 * For production usage, see:
 * - src/lib/kafka/client.ts - Recommended producer implementation
 * 
 * Usage:
 *   node kafka-test.mjs
 * 
 * Or in Next.js API route or component:
 *   import { getProducer } from '@/lib/kafka/client';
 */

import { KafkaProducerClient } from './src/lib/kafka/client.js';

async function run() {
  const producer = new KafkaProducerClient();
  
  try {
    // Connect to Kafka
    await producer.connect();
    console.log("Connected to Kafka");
    
    // Send a message using recommended pattern
    const metadata = await producer.sendMessage(
      'campaign.created.json',
      {
        campaign_id: '123',
        name: 'Example Campaign from Next.js',
        created_at: new Date().toISOString(),
      },
      '123', // Key for partitioning
      {
        source: 'nextjs-example',
        version: '1.0',
      }
    );
    
    console.log("Message sent successfully:", metadata);
    console.log(`Topic: ${metadata.topicName}, Partition: ${metadata.partition}, Offset: ${metadata.offset}`);
    
    // Example: Send batch messages
    const batchMetadata = await producer.sendBatch([
      {
        topic: 'campaign.created.json',
        value: { campaign_id: '124', name: 'Campaign 1' },
        key: '124',
      },
      {
        topic: 'campaign.created.json',
        value: { campaign_id: '125', name: 'Campaign 2' },
        key: '125',
      },
    ]);
    
    console.log(`Sent ${batchMetadata.length} messages in batch`);
    
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  } finally {
    // Always disconnect
    await producer.disconnect();
    console.log("Disconnected from Kafka");
  }
}

run().catch(console.error);
