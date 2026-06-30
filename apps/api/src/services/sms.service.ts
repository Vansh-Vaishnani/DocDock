import { config } from '../common/config';

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

export class TwilioSmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    const accountSid = config.twilioAccountSid;
    const authToken = config.twilioAuthToken;
    const from = config.twilioPhoneNumber;

    if (!accountSid || !authToken || !from) {
      console.warn('[TwilioSmsProvider] Twilio is not fully configured. Falling back to console logging.');
      console.log(`[SMS SENDER MOCK] To: ${to}\nMessage: ${message}`);
      return true;
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const body = new URLSearchParams({ To: to, From: from, Body: message });
      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[TwilioSmsProvider] Error response:', errText);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[TwilioSmsProvider] Exception:', err);
      return false;
    }
  }
}

export class Fast2SmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    const apiKey = config.fast2SmsApiKey;
    if (!apiKey) {
      console.warn('[Fast2SmsProvider] API key missing. Falling back to console logging.');
      console.log(`[SMS SENDER MOCK] To: ${to}\nMessage: ${message}`);
      return true;
    }

    try {
      const cleanTo = to.replace(/\D/g, '');
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'q',
          message: message,
          numbers: cleanTo
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Fast2SmsProvider] Error response:', errText);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Fast2SmsProvider] Exception:', err);
      return false;
    }
  }
}

export class Msg91SmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    const authKey = config.msg91AuthKey;
    if (!authKey) {
      console.warn('[Msg91SmsProvider] Auth key missing. Falling back to console logging.');
      console.log(`[SMS SENDER MOCK] To: ${to}\nMessage: ${message}`);
      return true;
    }

    try {
      const cleanTo = to.replace(/\D/g, '');
      const response = await fetch('https://api.msg91.com/api/v5/sms/send', {
        method: 'POST',
        headers: {
          'authkey': authKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          recipients: [{ mobiles: cleanTo, message }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[Msg91SmsProvider] Error response:', errText);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Msg91SmsProvider] Exception:', err);
      return false;
    }
  }
}

export class ConsoleSmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`\n📬 [SMS SENT TO ${to}]\n--------------------\n${message}\n--------------------\n`);
    return true;
  }
}

export class SmsService {
  private provider: ISmsProvider;

  constructor() {
    const providerType = config.smsProvider || 'console';
    console.log(`[SmsService] Initializing with provider: ${providerType}`);
    if (providerType === 'twilio') {
      this.provider = new TwilioSmsProvider();
    } else if (providerType === 'fast2sms') {
      this.provider = new Fast2SmsProvider();
    } else if (providerType === 'msg91') {
      this.provider = new Msg91SmsProvider();
    } else {
      this.provider = new ConsoleSmsProvider();
    }
  }

  async sendOtpSms(to: string, otp: string): Promise<boolean> {
    const message = `Your doctor has arrived.\n\nOTP: ${otp}\n\nShare this OTP with your doctor to begin the consultation.`;
    return this.provider.sendSms(to, message);
  }
}

export const smsService = new SmsService();
