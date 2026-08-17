// @ts-check
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
module.exports = {
  mutate: [
    'src/common/middleware/authMiddleware.ts',
    'src/modules/payment/payment.service.ts',
  ],
  testRunner: 'vitest',
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'perTest',
};
