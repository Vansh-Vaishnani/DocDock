import { Kafka, KafkaConfig } from 'kafkajs';

/**
 * Builds or returns a singleton Kafka client from environment variables.
 * Returns null if KAFKA_BROKERS is missing or empty.
 */
export function getKafkaClient(): Kafka | null {
  const brokers = process.env.KAFKA_BROKERS;
  if (!brokers || brokers.trim() === '') {
    return null;
  }

  const clientId = process.env.KAFKA_CLIENT_ID || 'docdock-api';
  const brokerList = brokers.split(',').map((b) => b.trim());

  const kafkaConfig: KafkaConfig = {
    clientId,
    brokers: brokerList,
    retry: {
      initialRetryTime: 300,
      retries: 5,
    },
  };

  const saslUsername = process.env.KAFKA_SASL_USERNAME;
  const saslPassword = process.env.KAFKA_SASL_PASSWORD;
  if (saslUsername && saslPassword) {
    kafkaConfig.ssl = true;
    kafkaConfig.sasl = {
      mechanism: 'plain',
      username: saslUsername,
      password: saslPassword,
    };
  }

  return new Kafka(kafkaConfig);
}
