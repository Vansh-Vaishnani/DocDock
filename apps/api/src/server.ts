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
import { config } from './common/config';
import { errorHandler } from './common/errors/errorHandler';
import { authenticate } from './common/middleware/authMiddleware';
import { registerGlobalMiddleware } from './common/middleware/globalMiddleware';
import { initializeSocketServer } from './sockets/gateway';
import { initializeServices } from './common/utils/initialization';
import { getInitializationStatus } from './common/utils/initialization';
import { AppointmentService } from './modules/appointment/appointment.service';
import './jobs/workers';

const app = express();
const server = createServer(app);
initializeSocketServer(server);

registerGlobalMiddleware(app);

app.get('/api/v1/health', (req, res) => {
  const status = getInitializationStatus();
  const allHealthy = status.mongodb && status.redis;
  
  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    message: allHealthy ? 'DocDock API is running' : 'Service degraded',
    status: {
      api: 'running',
      mongodb: status.mongodb,
      redis: status.redis,
      payment: status.payment,
      email: status.email,
      oauth: status.oauth
    }
  });
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

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'DocDock API is running',
    api: {
      health: '/api/v1/health',
      docs: '/api/v1/docs',
    },
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: {
      code: 'NOT_FOUND',
      details: [],
    },
  });
});

app.use(errorHandler);

const start = async (): Promise<void> => {
  try {
    // Initialize and validate all services
    const initResult = await initializeServices();

    if (!initResult.success) {
      console.error('\n❌ Fatal: Cannot start server. Critical services failed to initialize.');
      console.error('Errors:', initResult.errors);
      process.exit(1);
    }

    // Start the server
    server.listen(config.port, () => {
      console.log(`\n🎉 DocDock API listening on http://localhost:${config.port}`);
      console.log(`📚 API Documentation: http://localhost:${config.port}/api/v1/docs`);
      console.log(`❤️  Health Check: http://localhost:${config.port}/api/v1/health\n`);

      // Start background online appointment timeout checker (every 60 seconds)
      const appointmentService = new AppointmentService();
      setInterval(() => {
        appointmentService.checkOnlineTimeouts().catch((err) => {
          console.error('[Timeout Check Job] Error during execution:', err);
        });
      }, 60000);
    });
  } catch (error) {
    console.error('🚨 Failed to start server:', error);
    process.exit(1);
  }
};

start();
