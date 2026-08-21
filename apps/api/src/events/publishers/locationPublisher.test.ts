import { describe, it, expect, vi, beforeEach } from 'vitest';

import { publishEvent } from '../kafka/producer';
import { KAFKA_TOPICS } from '../kafka/topics';

import {
  publishDoctorOnTheWay,
  publishDoctorArrived,
  publishTripCancelled,
  publishTripCompleted,
} from './locationPublisher';

vi.mock('../kafka/producer', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

describe('Location Kafka Publishers Unit Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishDoctorOnTheWay', () => {
    it('should construct DoctorOnTheWay event and call publishEvent with DOCTOR_ON_THE_WAY topic', async () => {
      const params = {
        appointmentId: '507f191e810c19729de86001',
        doctorId: '507f191e810c19729de86002',
        patientId: '507f191e810c19729de86003',
      };

      await publishDoctorOnTheWay(params);

      expect(publishEvent).toHaveBeenCalledTimes(1);
      expect(publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.DOCTOR_ON_THE_WAY,
        expect.objectContaining({
          eventType: 'DoctorOnTheWay',
          appointmentId: '507f191e810c19729de86001',
          doctorId: '507f191e810c19729de86002',
          patientId: '507f191e810c19729de86003',
          source: 'docdock-api',
          eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
          startedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
    });

    it('should generate unique eventIds across multiple calls', async () => {
      const params = {
        appointmentId: 'appt_1',
        doctorId: 'doc_1',
        patientId: 'pat_1',
      };

      await publishDoctorOnTheWay(params);
      await publishDoctorOnTheWay(params);

      const calls = vi.mocked(publishEvent).mock.calls;
      const eventId1 = calls[0][1].eventId;
      const eventId2 = calls[1][1].eventId;

      expect(eventId1).not.toBe(eventId2);
    });
  });

  describe('publishDoctorArrived', () => {
    it('should construct DoctorArrived event and call publishEvent with DOCTOR_ARRIVED topic', async () => {
      const params = {
        appointmentId: '507f191e810c19729de86001',
        doctorId: '507f191e810c19729de86002',
        patientId: '507f191e810c19729de86003',
      };

      await publishDoctorArrived(params);

      expect(publishEvent).toHaveBeenCalledTimes(1);
      expect(publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.DOCTOR_ARRIVED,
        expect.objectContaining({
          eventType: 'DoctorArrived',
          appointmentId: '507f191e810c19729de86001',
          doctorId: '507f191e810c19729de86002',
          patientId: '507f191e810c19729de86003',
          source: 'docdock-api',
          eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
          arrivedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
    });
  });

  describe('publishTripCancelled', () => {
    it('should construct TripCancelled event with reason and call publishEvent with TRIP_CANCELLED topic', async () => {
      const params = {
        appointmentId: '507f191e810c19729de86001',
        doctorId: '507f191e810c19729de86002',
        patientId: '507f191e810c19729de86003',
        cancelledBy: 'doctor' as const,
        reason: 'Traffic emergency',
      };

      await publishTripCancelled(params);

      expect(publishEvent).toHaveBeenCalledTimes(1);
      expect(publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.TRIP_CANCELLED,
        expect.objectContaining({
          eventType: 'TripCancelled',
          appointmentId: '507f191e810c19729de86001',
          doctorId: '507f191e810c19729de86002',
          patientId: '507f191e810c19729de86003',
          cancelledBy: 'doctor',
          reason: 'Traffic emergency',
          source: 'docdock-api',
        })
      );
    });

    it('should handle optional reason parameter when omitted', async () => {
      const params = {
        appointmentId: '507f191e810c19729de86001',
        doctorId: '507f191e810c19729de86002',
        patientId: '507f191e810c19729de86003',
        cancelledBy: 'patient' as const,
      };

      await publishTripCancelled(params);

      expect(publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.TRIP_CANCELLED,
        expect.objectContaining({
          eventType: 'TripCancelled',
          cancelledBy: 'patient',
          reason: undefined,
        })
      );
    });
  });

  describe('publishTripCompleted', () => {
    it('should construct TripCompleted event and call publishEvent with TRIP_COMPLETED topic', async () => {
      const params = {
        appointmentId: '507f191e810c19729de86001',
        doctorId: '507f191e810c19729de86002',
        patientId: '507f191e810c19729de86003',
      };

      await publishTripCompleted(params);

      expect(publishEvent).toHaveBeenCalledTimes(1);
      expect(publishEvent).toHaveBeenCalledWith(
        KAFKA_TOPICS.TRIP_COMPLETED,
        expect.objectContaining({
          eventType: 'TripCompleted',
          appointmentId: '507f191e810c19729de86001',
          doctorId: '507f191e810c19729de86002',
          patientId: '507f191e810c19729de86003',
          source: 'docdock-api',
          completedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        })
      );
    });

    it('should propagate rejection from publishEvent when Kafka fails', async () => {
      vi.mocked(publishEvent).mockRejectedValueOnce(new Error('Broker unreachable'));

      await expect(
        publishTripCompleted({
          appointmentId: 'appt_err',
          doctorId: 'doc_err',
          patientId: 'pat_err',
        })
      ).rejects.toThrow('Broker unreachable');
    });
  });
});
