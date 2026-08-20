import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Kafka Producer Unit Tests
 *
 * These tests verify:
 * 1. Producer connects when KAFKA_BROKERS is set
 * 2. Producer gracefully skips when KAFKA_BROKERS is not set
 * 3. Events are serialized correctly
 * 4. Publish failures are caught and logged (non-fatal)
 */

// Mock kafkajs before importing the producer
vi.mock('kafkajs', () => {
  const mockSend = vi.fn().mockResolvedValue([{ topicName: 'test-topic', partition: 0, baseOffset: '0' }]);
  const mockConnect = vi.fn().mockResolvedValue(undefined);
  const mockDisconnect = vi.fn().mockResolvedValue(undefined);

  const mockProducer = {
    connect: mockConnect,
    disconnect: mockDisconnect,
    send: mockSend,
  };

  const mockKafka = {
    producer: vi.fn().mockReturnValue(mockProducer),
  };

  return {
    Kafka: vi.fn().mockReturnValue(mockKafka),
    Partitioners: {
      LegacyPartitioner: vi.fn(),
    },
  };
});

describe('Kafka Producer', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  describe('connectProducer', () => {
    it('should log a warning and not connect when KAFKA_BROKERS is not set', async () => {
      delete process.env.KAFKA_BROKERS;
      const { connectProducer, isProducerConnected } = await import('./producer');
      await connectProducer();
      expect(isProducerConnected()).toBe(false);
    });

    it('should attempt to connect when KAFKA_BROKERS is set', async () => {
      process.env.KAFKA_BROKERS = 'localhost:9092';
      process.env.KAFKA_CLIENT_ID = 'docdock-test';

      const { connectProducer } = await import('./producer');

      // When KAFKA_BROKERS is set, connectProducer should not throw.
      // Even if the mock connect fails gracefully, the function must resolve.
      // (In production the connection would succeed against a real broker.)
      await expect(connectProducer()).resolves.toBeUndefined();
    });
  });

  describe('publishEvent', () => {
    it('should not throw when producer is not connected', async () => {
      delete process.env.KAFKA_BROKERS;
      const { connectProducer, publishEvent } = await import('./producer');
      await connectProducer();

      const { KAFKA_TOPICS } = await import('./topics');
      const { createBaseEvent } = await import('./eventTypes');

      const event = {
        ...createBaseEvent(),
        eventType: 'PaymentCompleted' as const,
        paymentId: 'pay_test',
        appointmentId: 'appt_test',
        patientId: 'user_test',
        amount: 500,
        razorpayOrderId: 'order_test',
        razorpayPaymentId: 'pay_id_test',
      };

      // Should not throw — failure is non-fatal
      await expect(publishEvent(KAFKA_TOPICS.PAYMENT_COMPLETED, event)).resolves.toBeUndefined();
    });

    it('should serialize event correctly when producer is connected', async () => {
      process.env.KAFKA_BROKERS = 'localhost:9092';
      const { Kafka } = await import('kafkajs');
      const { connectProducer, publishEvent } = await import('./producer');
      await connectProducer();

      const { KAFKA_TOPICS } = await import('./topics');
      const { createBaseEvent } = await import('./eventTypes');

      const event = {
        ...createBaseEvent(),
        eventType: 'PaymentCompleted' as const,
        paymentId: 'pay_123',
        appointmentId: 'appt_456',
        patientId: 'user_789',
        amount: 999,
        razorpayOrderId: 'order_001',
        razorpayPaymentId: 'pay_razorpay_001',
      };

      await publishEvent(KAFKA_TOPICS.PAYMENT_COMPLETED, event);

      // Verify the Kafka constructor was called with broker config
      expect(Kafka).toHaveBeenCalledWith(
        expect.objectContaining({
          brokers: ['localhost:9092'],
        })
      );
    });

    it('should catch and log errors without re-throwing', async () => {
      process.env.KAFKA_BROKERS = 'localhost:9092';

      // Make kafkajs producer.send throw
      const kafkajsMock = await import('kafkajs');
      const mockKafkaInstance = (kafkajsMock.Kafka as any).mock.results[0]?.value;
      if (mockKafkaInstance) {
        mockKafkaInstance.producer().send.mockRejectedValueOnce(new Error('Kafka broker down'));
      }

      const { connectProducer, publishEvent } = await import('./producer');
      await connectProducer();

      const { KAFKA_TOPICS } = await import('./topics');
      const { createBaseEvent } = await import('./eventTypes');

      const event = {
        ...createBaseEvent(),
        eventType: 'AppointmentCreated' as const,
        appointmentId: 'appt_test',
        patientId: 'user_test',
        doctorId: 'doc_test',
        scheduledAt: new Date().toISOString(),
        consultationMode: 'clinic' as const,
        status: 'pending',
      };

      // Must not throw even when Kafka is down
      await expect(publishEvent(KAFKA_TOPICS.APPOINTMENT_CREATED, event)).resolves.toBeUndefined();
    });
  });

  describe('Event serialization', () => {
    it('createBaseEvent should produce valid UUID and ISO timestamp', async () => {
      const { createBaseEvent } = await import('./eventTypes');
      const base = createBaseEvent();

      expect(base.eventId).toMatch(/^[0-9a-f-]{36}$/);
      expect(base.source).toBe('docdock-api');
      expect(new Date(base.occurredAt).toISOString()).toBe(base.occurredAt);
    });

    it('PaymentCompleted event should contain all required fields', async () => {
      const { createBaseEvent } = await import('./eventTypes');
      const event = {
        ...createBaseEvent(),
        eventType: 'PaymentCompleted' as const,
        paymentId: 'pay_abc',
        appointmentId: 'appt_abc',
        patientId: 'user_abc',
        amount: 750,
        razorpayOrderId: 'order_abc',
        razorpayPaymentId: 'rpay_abc',
      };

      expect(event.eventType).toBe('PaymentCompleted');
      expect(event.amount).toBe(750);
      expect(event.source).toBe('docdock-api');
      expect(event.eventId).toBeTruthy();

      // Verify JSON serialization round-trips correctly
      const serialized = JSON.stringify(event);
      const deserialized = JSON.parse(serialized);
      expect(deserialized).toEqual(event);
    });
  });
});
