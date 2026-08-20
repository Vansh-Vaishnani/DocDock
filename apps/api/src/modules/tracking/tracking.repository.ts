import { redisClient } from '../../common/config';
import { DoctorModel } from '../doctor/doctor.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { TrackingModel, ITrackingDocument } from './tracking.model';

export interface EphemeralLocation {
  latitude: number;
  longitude: number;
  timestamp: number;
  appointmentId: string;
  doctorId: string;
}

export class TrackingRepository {
  /** TTL for ephemeral location in Redis (60 seconds) */
  private readonly LOCATION_TTL_SECONDS = 60;

  /**
   * Save ephemeral live location to Redis key `appointment:{id}:location` with TTL.
   */
  async setEphemeralLocation(
    appointmentId: string,
    doctorId: string,
    coordinates: [number, number],
    timestamp: number = Date.now()
  ): Promise<EphemeralLocation> {
    const key = `appointment:${appointmentId}:location`;
    const payload: EphemeralLocation = {
      longitude: coordinates[0],
      latitude: coordinates[1],
      timestamp,
      appointmentId,
      doctorId,
    };

    if (redisClient.isOpen) {
      await redisClient.set(key, JSON.stringify(payload), {
        EX: this.LOCATION_TTL_SECONDS,
      });
    }

    return payload;
  }

  /**
   * Get ephemeral live location from Redis.
   */
  async getEphemeralLocation(appointmentId: string): Promise<EphemeralLocation | null> {
    const key = `appointment:${appointmentId}:location`;
    if (!redisClient.isOpen) {
      return null;
    }
    const raw = await redisClient.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as EphemeralLocation;
    } catch {
      return null;
    }
  }

  /**
   * Clear ephemeral location from Redis when trip ends / completes / cancels.
   */
  async clearEphemeralLocation(appointmentId: string): Promise<void> {
    const key = `appointment:${appointmentId}:location`;
    if (redisClient.isOpen) {
      await redisClient.del(key);
    }
  }

  async getOrCreateSession(appointmentId: string, doctorId: string, patientId: string): Promise<ITrackingDocument> {
    const session = await TrackingModel.findOne({ appointmentId });
    if (session) {
      return session;
    }
    const [doctor, appointment] = await Promise.all([
      DoctorModel.findById(doctorId),
      AppointmentModel.findById(appointmentId)
    ]);
    const doctorCoords = doctor?.location?.coordinates || [72.5714, 23.0225];
    const patientCoords = appointment?.address?.location?.coordinates || [72.5714, 23.0225];

    return TrackingModel.create({
      appointmentId,
      doctorId,
      patientId,
      status: 'idle',
      doctorCurrentLocation: {
        type: 'Point',
        coordinates: doctorCoords,
        updatedAt: new Date()
      },
      patientLocation: {
        type: 'Point',
        coordinates: patientCoords
      }
    });
  }

  async getByAppointmentId(appointmentId: string): Promise<ITrackingDocument | null> {
    return TrackingModel.findOne({ appointmentId }).lean();
  }

  async updateLocation(appointmentId: string, coordinates: [number, number]): Promise<ITrackingDocument | null> {
    return TrackingModel.findOneAndUpdate(
      { appointmentId },
      {
        $set: {
          status: 'active',
          doctorCurrentLocation: { type: 'Point', coordinates, updatedAt: new Date() },
          lastHeartbeatAt: new Date()
        }
      },
      { new: true }
    );
  }

  async updateHeartbeat(appointmentId: string): Promise<ITrackingDocument | null> {
    return TrackingModel.findOneAndUpdate(
      { appointmentId },
      { $set: { lastHeartbeatAt: new Date() } },
      { new: true }
    );
  }
}
