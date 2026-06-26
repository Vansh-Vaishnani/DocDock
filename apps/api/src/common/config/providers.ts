import { config } from './index';

export const isRazorpayEnabled = (): boolean => {
  return Boolean(config.razorpayKeyId && config.razorpayKeySecret);
};

export const isCloudinaryEnabled = (): boolean => {
  return Boolean(config.cloudinaryCloudName && config.cloudinaryApiKey && config.cloudinaryApiSecret);
};

export const isTwilioEnabled = (): boolean => {
  return Boolean(config.twilioAccountSid && config.twilioAuthToken);
};

export const isSendGridEnabled = (): boolean => {
  return Boolean(config.emailProviderApiKey);
};
