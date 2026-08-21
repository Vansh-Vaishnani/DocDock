import crypto from 'crypto';

import { describe, it, expect, vi, beforeEach } from 'vitest';


import { ApiError } from '../../common/errors/ApiError';
import * as providers from '../../common/config/providers';
import { config } from '../../common/config';

import { PaymentService } from './payment.service';

describe('PaymentService Unit Tests', () => {
  let paymentService: PaymentService;

  beforeEach(() => {
    paymentService = new PaymentService();
    vi.restoreAllMocks();
  });

  describe('verifySignature', () => {
    it('should throw 503 ApiError if Razorpay is not configured', async () => {
      vi.spyOn(providers, 'isRazorpayEnabled').mockReturnValue(false);

      await expect(
        paymentService.verifySignature('order_123|pay_123', 'signature')
      ).rejects.toThrow(ApiError);
    });

    it('should return true for valid HMAC SHA256 signature', async () => {
      vi.spyOn(providers, 'isRazorpayEnabled').mockReturnValue(true);
      const payload = 'order_98765|pay_54321';
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpayKeySecret)
        .update(payload)
        .digest('hex');

      const isValid = await paymentService.verifySignature(payload, expectedSignature);
      expect(isValid).toBe(true);
    });

    it('should return false for tampered or invalid signature', async () => {
      vi.spyOn(providers, 'isRazorpayEnabled').mockReturnValue(true);
      const payload = 'order_98765|pay_54321';
      const tamperedSignature = 'invalid_tampered_signature_hash_123456';

      const isValid = await paymentService.verifySignature(payload, tamperedSignature);
      expect(isValid).toBe(false);
    });
  });
});
