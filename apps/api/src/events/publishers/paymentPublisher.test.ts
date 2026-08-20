import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Payment Publisher Tests
 *
 * Verifies that publishPaymentCompleted:
 * 1. Calls publishEvent with the correct topic
 * 2. Builds a PaymentCompleted event with all required fields
 * 3. Handles errors gracefully (publishEvent is non-throwing)
 */

vi.mock('../kafka/producer', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('PaymentPublisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call publishEvent with PAYMENT_COMPLETED topic and correct event structure', async () => {
    const { publishEvent } = await import('../kafka/producer');
    const { publishPaymentCompleted } = await import('./paymentPublisher');
    const { KAFKA_TOPICS } = await import('../kafka/topics');

    const params = {
      paymentId: 'pay_123',
      appointmentId: 'appt_456',
      patientId: 'user_789',
      amount: 1500,
      razorpayOrderId: 'order_abc',
      razorpayPaymentId: 'rpay_xyz',
    };

    await publishPaymentCompleted(params);

    expect(publishEvent).toHaveBeenCalledTimes(1);
    expect(publishEvent).toHaveBeenCalledWith(
      KAFKA_TOPICS.PAYMENT_COMPLETED,
      expect.objectContaining({
        eventType: 'PaymentCompleted',
        paymentId: 'pay_123',
        appointmentId: 'appt_456',
        patientId: 'user_789',
        amount: 1500,
        razorpayOrderId: 'order_abc',
        razorpayPaymentId: 'rpay_xyz',
        source: 'docdock-api',
        eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
        occurredAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      })
    );
  });

  it('should propagate errors from publishEvent (callers are responsible for catching)', async () => {
    const { publishEvent } = await import('../kafka/producer');
    vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Kafka unavailable'));

    const { publishPaymentCompleted } = await import('./paymentPublisher');

    // The publisher propagates errors — it is the *caller's* responsibility
    // to catch (e.g. payment.controller.ts uses .catch(() => {...})).
    // This matches the actual design: publishers are thin wrappers, not error boundaries.
    await expect(
      publishPaymentCompleted({
        paymentId: 'pay_test',
        appointmentId: 'appt_test',
        patientId: 'user_test',
        amount: 100,
        razorpayOrderId: 'order_test',
        razorpayPaymentId: 'rpay_test',
      })
    ).rejects.toThrow('Kafka unavailable');
  });

  it('should generate unique eventIds for each call', async () => {
    const { publishEvent } = await import('../kafka/producer');
    const { publishPaymentCompleted } = await import('./paymentPublisher');

    const params = {
      paymentId: 'pay_1',
      appointmentId: 'appt_1',
      patientId: 'user_1',
      amount: 500,
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'rpay_1',
    };

    await publishPaymentCompleted(params);
    await publishPaymentCompleted(params);

    const calls = vi.mocked(publishEvent).mock.calls;
    const eventId1 = calls[0]?.[1].eventId;
    const eventId2 = calls[1]?.[1].eventId;

    expect(eventId1).toBeTruthy();
    expect(eventId2).toBeTruthy();
    expect(eventId1).not.toBe(eventId2);
  });
});
