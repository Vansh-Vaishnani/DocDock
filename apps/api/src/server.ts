import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import authRoutes from './modules/auth/auth.routes';
import doctorRoutes from './modules/doctor/doctor.routes';
import patientRoutes from './modules/patient/patient.routes';
import appointmentRoutes from './modules/appointment/appointment.routes';
import paymentRoutes from './modules/payment/payment.routes';
import adminRoutes from './modules/admin/admin.routes';
import reviewRoutes from './modules/review/review.routes';
import prescriptionRoutes from './modules/prescription/prescription.routes';
import { config, connectRedis } from './common/config';
import { errorHandler } from './common/errors/errorHandler';
import { authenticate } from './common/middleware/authMiddleware';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('dev'));

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'DocDock API is running' });
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/patients', authenticate, patientRoutes);
app.use('/api/v1/appointments', authenticate, appointmentRoutes);
app.use('/api/v1/payments', authenticate, paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/prescriptions', authenticate, prescriptionRoutes);
app.use('/api/v1/admin', authenticate, adminRoutes);

app.use(errorHandler);

const start = async (): Promise<void> => {
  await connectRedis();
  await mongoose.connect(config.mongoUri, { autoIndex: true });
  server.listen(config.port, () => {
    console.log(`DocDock API listening on http://localhost:${config.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
