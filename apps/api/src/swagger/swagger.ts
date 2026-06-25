export const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'DocDock API',
    version: '1.0.0',
    description: 'Backend API for the DocDock doctor-on-demand platform.'
  },
  paths: {
    '/api/v1/auth/register': {
      post: { summary: 'Register a new user' }
    },
    '/api/v1/auth/login': {
      post: { summary: 'Login a user' }
    },
    '/api/v1/doctors/nearby': {
      get: { summary: 'Find nearby doctors' }
    },
    '/api/v1/appointments': {
      post: { summary: 'Create an appointment' }
    },
    '/api/v1/payments/create-order': {
      post: { summary: 'Create a Razorpay order' }
    },
    '/api/v1/payments/verify': {
      post: { summary: 'Verify a Razorpay payment' }
    },
    '/api/v1/tracking/{appointmentId}/location': {
      get: { summary: 'Get tracking location' },
      patch: { summary: 'Update doctor location' }
    },
    '/api/v1/chat/room': {
      post: { summary: 'Create or retrieve a chat room' }
    },
    '/api/v1/notifications': {
      get: { summary: 'List notifications' }
    }
  }
};
