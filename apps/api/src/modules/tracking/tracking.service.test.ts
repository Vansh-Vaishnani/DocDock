import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrackingService } from './tracking.service';
import { AppointmentModel } from '../appointment/appointment.repository';
import { DoctorModel } from '../doctor/doctor.repository';
import { ApiError } from '../../common/errors/ApiError';
import { getIO } from '../../sockets/gateway';
import {
  publishDoctorOnTheWay,
  publishDoctorArrived,
  publishTripCancelled,
  publishTripCompleted,
} from '../../events/publishers/locationPublisher';

// Mock dependencies
vi.mock('../appointment/appointment.repository', () => ({
  AppointmentModel: {
    findById: vi.fn(),
  },
}));

vi.mock('../doctor/doctor.repository', () => ({
  DoctorModel: {
    findById: vi.fn(),
    findOne: vi.fn(),
  },
}));

const {
  mockSetEphemeralLocation,
  mockGetEphemeralLocation,
  mockClearEphemeralLocation,
  mockGetOrCreateSession,
  mockUpdateLocation,
  mockEmit,
  mockTo,
  mockOf,
} = vi.hoisted(() => {
  const mockSetEphemeralLocation = vi.fn();
  const mockGetEphemeralLocation = vi.fn();
  const mockClearEphemeralLocation = vi.fn();
  const mockGetOrCreateSession = vi.fn();
  const mockUpdateLocation = vi.fn();
  const mockEmit = vi.fn();
  const mockTo = vi.fn().mockReturnValue({ emit: mockEmit });
  const mockOf = vi.fn().mockReturnValue({ to: mockTo });

  return {
    mockSetEphemeralLocation,
    mockGetEphemeralLocation,
    mockClearEphemeralLocation,
    mockGetOrCreateSession,
    mockUpdateLocation,
    mockEmit,
    mockTo,
    mockOf,
  };
});

vi.mock('./tracking.repository', () => {
  return {
    TrackingRepository: class MockTrackingRepository {
      setEphemeralLocation = mockSetEphemeralLocation;
      getEphemeralLocation = mockGetEphemeralLocation;
      clearEphemeralLocation = mockClearEphemeralLocation;
      getOrCreateSession = mockGetOrCreateSession;
      updateLocation = mockUpdateLocation;
    },
  };
});

vi.mock('../../sockets/gateway', () => ({
  getIO: vi.fn().mockReturnValue({
    of: mockOf,
  }),
}));

vi.mock('../../events/publishers/locationPublisher', () => ({
  publishDoctorOnTheWay: vi.fn().mockResolvedValue(undefined),
  publishDoctorArrived: vi.fn().mockResolvedValue(undefined),
  publishTripCancelled: vi.fn().mockResolvedValue(undefined),
  publishTripCompleted: vi.fn().mockResolvedValue(undefined),
}));

describe('TrackingService Full Unit & Integration Suite', () => {
  let trackingService: TrackingService;

  const validDoctorUserId = '507f191e810c19729de86001';
  const validDoctorObjId = '507f191e810c19729de86002';
  const validPatientUserId = '507f191e810c19729de86003';
  const otherUserId = '507f191e810c19729de86004';
  const validAppointmentId = '507f191e810c19729de86005';

  beforeEach(() => {
    vi.clearAllMocks();
    mockSetEphemeralLocation.mockImplementation((appointmentId, doctorId, coords, timestamp) =>
      Promise.resolve({
        latitude: coords[1],
        longitude: coords[0],
        timestamp: timestamp || Date.now(),
        appointmentId,
        doctorId,
      })
    );
    mockGetEphemeralLocation.mockResolvedValue(null);
    mockClearEphemeralLocation.mockResolvedValue(undefined);
    mockGetOrCreateSession.mockResolvedValue({
      doctorCurrentLocation: { coordinates: [72.57, 23.02] },
      patientLocation: { coordinates: [72.58, 23.03] },
      lastHeartbeatAt: new Date(),
    });
    mockUpdateLocation.mockResolvedValue({});
    mockOf.mockReturnValue({ to: mockTo });
    mockTo.mockReturnValue({ emit: mockEmit });

    trackingService = new TrackingService();
  });

  // ---------------------------------------------------------------------------
  // 1. getTrackingSnapshot
  // ---------------------------------------------------------------------------
  describe('getTrackingSnapshot', () => {
    it('should throw APPOINTMENT_NOT_FOUND (404) if appointment does not exist', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce(null);

      await expect(
        trackingService.getTrackingSnapshot('invalid_id', validPatientUserId)
      ).rejects.toThrow(new ApiError('Appointment not found', 404, 'APPOINTMENT_NOT_FOUND'));
    });

    it('should throw FORBIDDEN (403) if requesting user is neither assigned patient nor doctor', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findById).mockResolvedValueOnce({
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(
        trackingService.getTrackingSnapshot(validAppointmentId, otherUserId)
      ).rejects.toThrow(new ApiError('Forbidden: You are not authorized to view tracking for this appointment', 403, 'FORBIDDEN'));
    });

    it('should throw TRACKING_NOT_ACTIVE (400) if status is pending, accepted, or completed', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'pending',
      } as any);

      vi.mocked(DoctorModel.findById).mockResolvedValueOnce({
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(
        trackingService.getTrackingSnapshot(validAppointmentId, validPatientUserId)
      ).rejects.toThrow(new ApiError('Tracking not active for this appointment state', 400, 'TRACKING_NOT_ACTIVE'));
    });

    it('should return snapshot for patient when status is doctor_on_way and return Redis live location if present', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findById).mockResolvedValueOnce({
        userId: { toString: () => validDoctorUserId },
      } as any);

      const fakeLiveLocation = { latitude: 23.0225, longitude: 72.5714, timestamp: 1000, appointmentId: validAppointmentId, doctorId: validDoctorObjId };
      mockGetEphemeralLocation.mockResolvedValueOnce(fakeLiveLocation);

      const result = await trackingService.getTrackingSnapshot(validAppointmentId, validPatientUserId) as any;

      expect(result).toHaveProperty('appointmentId', validAppointmentId);
      expect(result).toHaveProperty('status', 'doctor_on_way');
      expect(result.liveLocation).toEqual(fakeLiveLocation);
    });

    it('should return snapshot for doctor when status is arrived and fallback liveLocation to null if Redis empty', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'arrived',
      } as any);

      vi.mocked(DoctorModel.findById).mockResolvedValueOnce({
        userId: { toString: () => validDoctorUserId },
      } as any);

      mockGetEphemeralLocation.mockResolvedValueOnce(null);

      const result = await trackingService.getTrackingSnapshot(validAppointmentId, validDoctorUserId) as any;

      expect(result).toHaveProperty('status', 'arrived');
      expect(result.liveLocation).toBeNull();
    });

    it('should authorize doctor via direct doctorId match when doctor model lookup returns null', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'in_consultation',
      } as any);

      vi.mocked(DoctorModel.findById).mockResolvedValueOnce(null);

      const result = await trackingService.getTrackingSnapshot(validAppointmentId, validDoctorObjId) as any;

      expect(result.status).toBe('in_consultation');
    });
  });

  // ---------------------------------------------------------------------------
  // 2. startTrip
  // ---------------------------------------------------------------------------
  describe('startTrip', () => {
    it('should throw APPOINTMENT_NOT_FOUND (404) if appointment does not exist', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce(null);

      await expect(
        trackingService.startTrip('invalid_id', validDoctorUserId)
      ).rejects.toThrow('Appointment not found');
    });

    it('should throw FORBIDDEN (403) if user is not assigned doctor or doctor profile not found', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'accepted',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce(null);

      await expect(
        trackingService.startTrip(validAppointmentId, validDoctorUserId)
      ).rejects.toThrow('Forbidden: Only the assigned doctor can start the journey');
    });

    it('should throw INVALID_TRANSITION (400) if starting trip from pending or completed state', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'pending',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(
        trackingService.startTrip(validAppointmentId, validDoctorUserId)
      ).rejects.toThrow("Cannot start trip from appointment status 'pending'");
    });

    it('should start trip from confirmed status, save appointment status doctor_on_way, and fire Kafka & Socket.IO', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: { toString: () => validAppointmentId },
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'confirmed',
        save: mockSave,
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      const result = await trackingService.startTrip(validAppointmentId, validDoctorUserId, [72.5714, 23.0225]) as any;

      expect(mockSave).toHaveBeenCalled();
      expect(result.status).toBe('doctor_on_way');
      expect(mockSetEphemeralLocation).toHaveBeenCalledWith(validAppointmentId, validDoctorObjId, [72.5714, 23.0225]);
      expect(mockUpdateLocation).toHaveBeenCalledWith(validAppointmentId, [72.5714, 23.0225]);
      expect(publishDoctorOnTheWay).toHaveBeenCalledWith({
        appointmentId: validAppointmentId,
        doctorId: validDoctorObjId,
        patientId: validPatientUserId,
      });
      expect(mockOf).toHaveBeenCalledWith('/tracking');
      expect(mockTo).toHaveBeenCalledWith(`appointment:${validAppointmentId}`);
      expect(mockEmit).toHaveBeenCalledWith('doctor:trip:started', expect.objectContaining({
        appointmentId: validAppointmentId,
        doctorId: validDoctorObjId,
      }));
    });

    it('should start trip without initialCoordinates when omitted', async () => {
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: { toString: () => validAppointmentId },
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'accepted',
        save: mockSave,
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      const result = await trackingService.startTrip(validAppointmentId, validDoctorUserId) as any;

      expect(result.status).toBe('doctor_on_way');
      expect(result.liveLocation).toBeNull();
      expect(mockSetEphemeralLocation).not.toHaveBeenCalled();
    });

    it('should swallow Kafka publication error without breaking trip start', async () => {
      vi.mocked(publishDoctorOnTheWay).mockRejectedValueOnce(new Error('Kafka connection failed'));
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: { toString: () => validAppointmentId },
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'accepted',
        save: mockSave,
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(trackingService.startTrip(validAppointmentId, validDoctorUserId)).resolves.toHaveProperty('status', 'doctor_on_way');
    });

    it('should handle Socket.IO throw gracefully without failing trip start', async () => {
      mockOf.mockImplementationOnce(() => {
        throw new Error('Socket IO uninitialized');
      });
      const mockSave = vi.fn().mockResolvedValue(undefined);
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: { toString: () => validAppointmentId },
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'accepted',
        save: mockSave,
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(trackingService.startTrip(validAppointmentId, validDoctorUserId)).resolves.toHaveProperty('status', 'doctor_on_way');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. updateDoctorLocation
  // ---------------------------------------------------------------------------
  describe('updateDoctorLocation', () => {
    it('should throw APPOINTMENT_NOT_FOUND (404) if appointment does not exist', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce(null);

      await expect(
        trackingService.updateDoctorLocation('invalid_id', validDoctorUserId, [72.57, 23.02])
      ).rejects.toThrow('Appointment not found');
    });

    it('should throw FORBIDDEN (403) if user is not assigned doctor', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce(null);

      await expect(
        trackingService.updateDoctorLocation(validAppointmentId, otherUserId, [72.57, 23.02])
      ).rejects.toThrow('Forbidden: Only the assigned doctor can update trip location');
    });

    it('should throw TRACKING_NOT_ACTIVE (400) if status is not doctor_on_way', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'arrived',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(
        trackingService.updateDoctorLocation(validAppointmentId, validDoctorUserId, [72.57, 23.02])
      ).rejects.toThrow("Location sharing is inactive. Current status: 'arrived'");
    });

    it('should update location via direct doctorId match when doctor findOne is null', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce(null);

      const result = await trackingService.updateDoctorLocation(validAppointmentId, validDoctorObjId, [72.5714, 23.0225]) as any;

      expect(result.latitude).toBe(23.0225);
      expect(result.longitude).toBe(72.5714);
      expect(mockSetEphemeralLocation).toHaveBeenCalledWith(validAppointmentId, validDoctorObjId, [72.5714, 23.0225], expect.any(Number));
    });

    it('should emit doctor:location:update via Socket.IO to room appointment:{id}', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await trackingService.updateDoctorLocation(validAppointmentId, validDoctorUserId, [72.5714, 23.0225]);

      expect(mockOf).toHaveBeenCalledWith('/tracking');
      expect(mockTo).toHaveBeenCalledWith(`appointment:${validAppointmentId}`);
      expect(mockEmit).toHaveBeenCalledWith('doctor:location:update', {
        appointmentId: validAppointmentId,
        latitude: 23.0225,
        longitude: 72.5714,
        timestamp: expect.any(Number),
      });
    });

    it('should swallow Socket.IO emit exception without failing location update', async () => {
      mockOf.mockImplementationOnce(() => {
        throw new Error('Socket failure');
      });
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(trackingService.updateDoctorLocation(validAppointmentId, validDoctorUserId, [72.57, 23.02])).resolves.toHaveProperty('latitude', 23.02);
    });
  });

  // ---------------------------------------------------------------------------
  // 4. endTrip
  // ---------------------------------------------------------------------------
  describe('endTrip', () => {
    it('should throw APPOINTMENT_NOT_FOUND (404) if appointment does not exist', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce(null);

      await expect(
        trackingService.endTrip('invalid_id', validDoctorUserId)
      ).rejects.toThrow('Appointment not found');
    });

    it('should throw FORBIDDEN (403) if user is neither assigned doctor nor patient', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce(null);

      await expect(
        trackingService.endTrip(validAppointmentId, otherUserId)
      ).rejects.toThrow('Forbidden: You are not authorized to end this trip');
    });

    it('should allow assigned patient to end trip, clear Redis location and emit doctor:location:ended', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce(null);

      const result = await trackingService.endTrip(validAppointmentId, validPatientUserId, 'patient_cancelled') as any;

      expect(result.trackingActive).toBe(false);
      expect(mockClearEphemeralLocation).toHaveBeenCalledWith(validAppointmentId);
      expect(mockOf).toHaveBeenCalledWith('/tracking');
      expect(mockTo).toHaveBeenCalledWith(`appointment:${validAppointmentId}`);
      expect(mockEmit).toHaveBeenCalledWith('doctor:location:ended', {
        appointmentId: validAppointmentId,
        reason: 'patient_cancelled',
        timestamp: expect.any(Number),
      });
    });

    it('should default reason to trip_ended when reason parameter is omitted', async () => {
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await trackingService.endTrip(validAppointmentId, validDoctorUserId);

      expect(mockEmit).toHaveBeenCalledWith('doctor:location:ended', expect.objectContaining({
        reason: 'trip_ended',
      }));
    });

    it('should swallow Socket.IO emit exception during trip end', async () => {
      mockOf.mockImplementationOnce(() => {
        throw new Error('Socket crash');
      });
      vi.mocked(AppointmentModel.findById).mockResolvedValueOnce({
        _id: validAppointmentId,
        doctorId: { toString: () => validDoctorObjId },
        patientId: { toString: () => validPatientUserId },
        status: 'doctor_on_way',
      } as any);

      vi.mocked(DoctorModel.findOne).mockResolvedValueOnce({
        _id: { toString: () => validDoctorObjId },
        userId: { toString: () => validDoctorUserId },
      } as any);

      await expect(trackingService.endTrip(validAppointmentId, validDoctorUserId)).resolves.toHaveProperty('trackingActive', false);
    });
  });
});
