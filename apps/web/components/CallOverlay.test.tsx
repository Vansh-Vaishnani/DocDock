import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import CallOverlay from './CallOverlay';

// Mock auth context & toast context
vi.mock('@/app/auth/auth-context', () => ({
  useAuth: () => ({
    user: { _id: 'user_patient_1', fullName: 'Alice Patient', role: 'patient' },
  }),
}));

vi.mock('@/app/auth/toast-provider', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock socket.io-client
const mockSocket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  connected: true,
};
vi.mock('socket.io-client', () => ({
  io: () => mockSocket,
}));

describe('CallOverlay Component Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render nothing when callState is idle', () => {
    const { container } = render(<CallOverlay />);
    expect(container.firstChild).toBeNull();
  });
});
