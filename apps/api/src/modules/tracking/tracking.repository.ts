import { DoctorModel } from '../doctor/doctor.repository';
import { AppointmentModel } from '../appointment/appointment.repository';
import { TrackingModel, ITrackingDocument } from './tracking.model';

export class TrackingRepository {
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
