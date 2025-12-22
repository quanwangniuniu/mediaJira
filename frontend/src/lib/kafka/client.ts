/**
 * Kafka Client Utilities for Frontend
 * Recommended producer pattern with proper error handling, retry logic, and connection management.
 */

import { Kafka, Producer, ProducerRecord, RecordMetadata } from 'kafkajs';

// Get Kafka broker from environment variable
const getBootstrapServers = (): string => {
  // Default to EXTERNAL listener for host/browser access
  // In production, this should be set via environment variable
  return process.env.NEXT_PUBLIC_KAFKA_BROKER || process.env.KAFKA_BROKER || 'localhost:29092';
};

// Create Kafka instance
const createKafkaClient = (): Kafka => {
  const brokers = getBootstrapServers().split(',').map(b => b.trim());
  
  return new Kafka({
    clientId: `mediajira-frontend-${typeof window !== 'undefined' ? window.location.hostname : 'server'}`,
    brokers,
    // Connection timeout
    connectionTimeout: 3000,
    requestTimeout: 30000,
    retry: {
      retries: 3,
      initialRetryTime: 100,
      multiplier: 2,
      maxRetryTime: 30000,
    },
  });
};

/**
 * Kafka Producer Client
 * Provides production-ready producer with error handling and retry logic
 */
export class KafkaProducerClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = createKafkaClient();
  }

  /**
   * Connect to Kafka broker
   */
  async connect(): Promise<void> {
    if (this.isConnected && this.producer) {
      return;
    }

    try {
      this.producer = this.kafka.producer({
        // Idempotent producer to prevent duplicates
        idempotent: true,
        // Wait for acknowledgment from all in-sync replicas
        acks: -1, // -1 means 'all'
        // Retry configuration
        retry: {
          retries: 3,
          initialRetryTime: 100,
          multiplier: 2,
          maxRetryTime: 30000,
        },
        // Compression
        compression: 1, // GZIP (1), Snappy (2), LZ4 (3), Zstd (4)
        // Maximum batch size (bytes)
        maxInFlightRequests: 5,
      });

      await this.producer.connect();
      this.isConnected = true;
      console.log(`Kafka producer connected to ${getBootstrapServers()}`);
    } catch (error) {
      console.error('Failed to connect Kafka producer:', error);
      throw error;
    }
  }

  /**
   * Send a message to Kafka topic
   * 
   * @param topic Topic name (following domain.action.format convention)
   * @param value Message value (object will be JSON stringified)
   * @param key Optional message key (for partitioning)
   * @param headers Optional message headers
   * @returns Promise resolving to record metadata
   * 
   * @example
   * ```typescript
   * const producer = new KafkaProducerClient();
   * await producer.connect();
   * 
   * await producer.sendMessage(
   *   'campaign.created.json',
   *   { campaign_id: '123', name: 'Test Campaign' },
   *   '123',
   *   { source: 'frontend', version: '1.0' }
   * );
   * ```
   */
  async sendMessage(
    topic: string,
    value: Record<string, any> | string,
    key?: string,
    headers?: Record<string, string>
  ): Promise<RecordMetadata> {
    if (!this.producer || !this.isConnected) {
      await this.connect();
    }

    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    try {
      // Serialize value if it's an object
      const serializedValue = typeof value === 'string' 
        ? value 
        : JSON.stringify(value);

      // Prepare record
      const record: ProducerRecord = {
        topic,
        messages: [
          {
            key: key,
            value: serializedValue,
            headers: headers ? Object.entries(headers).reduce((acc, [k, v]) => {
              acc[k] = Buffer.from(v);
              return acc;
            }, {} as Record<string, Buffer>) : undefined,
          },
        ],
      };

      // Send message and wait for acknowledgment
      const result = await this.producer.send(record);

      if (result && result[0]) {
        const metadata = result[0];
        console.debug(
          `Message sent successfully: topic=${metadata.topicName}, ` +
          `partition=${metadata.partition}, offset=${metadata.offset}`
        );
        return metadata;
      }

      throw new Error('No metadata returned from producer');
    } catch (error) {
      console.error(`Error sending message to topic '${topic}':`, error);
      throw error;
    }
  }

  /**
   * Send multiple messages in a batch
   * 
   * @param messages Array of message objects
   * @returns Promise resolving to array of record metadata
   * 
   * @example
   * ```typescript
   * await producer.sendBatch([
   *   {
   *     topic: 'campaign.created.json',
   *     value: { campaign_id: '123', name: 'Campaign 1' },
   *     key: '123',
   *   },
   *   {
   *     topic: 'campaign.created.json',
   *     value: { campaign_id: '124', name: 'Campaign 2' },
   *     key: '124',
   *   },
   * ]);
   * ```
   */
  async sendBatch(
    messages: Array<{
      topic: string;
      value: Record<string, any> | string;
      key?: string;
      headers?: Record<string, string>;
    }>
  ): Promise<RecordMetadata[]> {
    if (!this.producer || !this.isConnected) {
      await this.connect();
    }

    if (!this.producer) {
      throw new Error('Producer not initialized');
    }

    try {
      const records: ProducerRecord[] = messages.map(msg => ({
        topic: msg.topic,
        messages: [
          {
            key: msg.key,
            value: typeof msg.value === 'string' 
              ? msg.value 
              : JSON.stringify(msg.value),
            headers: msg.headers ? Object.entries(msg.headers).reduce((acc, [k, v]) => {
              acc[k] = Buffer.from(v);
              return acc;
            }, {} as Record<string, Buffer>) : undefined,
          },
        ],
      }));

      const results = await Promise.all(
        records.map(record => this.producer!.send(record))
      );

      return results.flat();
    } catch (error) {
      console.error('Error sending batch messages:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Kafka broker
   */
  async disconnect(): Promise<void> {
    if (this.producer && this.isConnected) {
      try {
        await this.producer.disconnect();
        this.isConnected = false;
        this.producer = null;
        console.log('Kafka producer disconnected');
      } catch (error) {
        console.error('Error disconnecting Kafka producer:', error);
        throw error;
      }
    }
  }
}

// Singleton instance (optional, for reuse across application)
let producerInstance: KafkaProducerClient | null = null;

/**
 * Get or create a singleton producer instance
 */
export const getProducer = (): KafkaProducerClient => {
  if (!producerInstance) {
    producerInstance = new KafkaProducerClient();
  }
  return producerInstance;
};

/**
 * Close the singleton producer instance
 */
export const closeProducer = async (): Promise<void> => {
  if (producerInstance) {
    await producerInstance.disconnect();
    producerInstance = null;
  }
};

// Example usage:
/*
import { getProducer } from '@/lib/kafka/client';

// In a React component or API route
const handleCampaignCreated = async (campaignData: Campaign) => {
  const producer = getProducer();
  
  try {
    await producer.connect();
    await producer.sendMessage(
      'campaign.created.json',
      {
        campaign_id: campaignData.id,
        name: campaignData.name,
        created_at: new Date().toISOString(),
      },
      campaignData.id,
      {
        source: 'frontend',
        version: '1.0',
        user_id: user.id,
      }
    );
  } catch (error) {
    console.error('Failed to send Kafka message:', error);
    // Handle error (show toast, log, etc.)
  } finally {
    // Optionally disconnect (or keep connected for multiple sends)
    // await producer.disconnect();
  }
};
*/

