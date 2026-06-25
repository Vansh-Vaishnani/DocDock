import { createServer } from 'http';

import express from 'express';
import mongoose from 'mongoose';

import { swaggerSpec } from './swagger/swagger';
import authRoutes from './modules/auth/auth.routes';
import doctorRoutes from './modules/doctor/doctor.routes';
import patientRoutes from './modules/patient/patient.routes';
import appointmentRoutes from './modules/appointment/appointment.routes';
import paymentRoutes from './modules/payment/payment.routes';
import adminRoutes from './modules/admin/admin.routes';
import reviewRoutes from './modules/review/review.routes';
import prescriptionRoutes from './modules/prescription/prescription.routes';
import trackingRoutes from './modules/tracking/tracking.routes';
import chatRoutes from './modules/chat/chat.routes';
import notificationRoutes from './modules/notification/notification.routes';
import { config, connectRedis } from './common/config';
import { errorHandler } from './common/errors/errorHandler';
import { authenticate } from './common/middleware/authMiddleware';
import { registerGlobalMiddleware } from './common/middleware/globalMiddleware';
import { initializeSocketServer } from './sockets/gateway';
import './jobs/workers';

const app = express();
const server = createServer(app);
initializeSocketServer(server);

registerGlobalMiddleware(app);

app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, message: 'DocDock API is running' });
});

app.get('/api/v1/docs', (req, res) => {
  res.json(swaggerSpec);
});

app.get('/api/v1/docs/swagger.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/doctors', doctorRoutes);
app.use('/api/v1/patients', authenticate, patientRoutes);
app.use('/api/v1/appointments', authenticate, appointmentRoutes);
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/v1/payments', authenticate, paymentRoutes);
app.use('/api/v1/tracking', authenticate, trackingRoutes);
app.use('/api/v1/chat', authenticate, chatRoutes);
app.use('/api/v1/notifications', authenticate, notificationRoutes);
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
