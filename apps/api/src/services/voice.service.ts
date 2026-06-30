import { config } from '../common/config';

export interface IVoiceProvider {
  initiateCall(fromPhone: string, toPhone: string, appointmentId: string): Promise<string>;
}

export class TwilioVoiceProvider implements IVoiceProvider {
  async initiateCall(fromPhone: string, toPhone: string, appointmentId: string): Promise<string> {
    const accountSid = config.twilioAccountSid;
    const authToken = config.twilioAuthToken;
    const twilioNumber = config.twilioPhoneNumber;
    // Callback URL that will return the TwiML to bridge the call to the other user
    const appUrl = config.apiUrl || 'http://localhost:4000/api/v1';

    if (!accountSid || !authToken || !twilioNumber) {
      console.warn('[TwilioVoiceProvider] Twilio credentials missing. Falling back to Console mock.');
      console.log(`[VOICE CALL MOCK] Bridging call: Caller(${fromPhone}) <-> Receiver(${toPhone}) for Appointment ${appointmentId}`);
      return 'mock_call_sid_' + Math.floor(100000 + Math.random() * 900000).toString();
    }

    try {
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const twimlUrl = `${appUrl}/appointments/${appointmentId}/twiml-callback?to=${encodeURIComponent(toPhone)}`;
      
      const body = new URLSearchParams({
        To: fromPhone,
        From: twilioNumber,
        Url: twimlUrl
      });

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('[TwilioVoiceProvider] Error initiating call:', errText);
        throw new Error('Twilio Call Initiation Failed');
      }

      const resData = (await response.json()) as { sid: string };
      return resData.sid;
    } catch (err) {
      console.error('[TwilioVoiceProvider] Exception:', err);
      throw err;
    }
  }
}

export class ConsoleVoiceProvider implements IVoiceProvider {
  async initiateCall(fromPhone: string, toPhone: string, appointmentId: string): Promise<string> {
    console.log(`\n📞 [VOICE CALL SENDER MOCK]\n--------------------\nInitiating anonymous call between ${fromPhone} and ${toPhone} for appointment ${appointmentId}.\n--------------------\n`);
    return 'mock_call_sid_' + Math.floor(100000 + Math.random() * 900000).toString();
  }
}

export class VoiceService {
  private provider: IVoiceProvider;

  constructor() {
    const providerType = config.callProvider || 'console';
    console.log(`[VoiceService] Initializing with provider: ${providerType}`);
    if (providerType === 'twilio') {
      this.provider = new TwilioVoiceProvider();
    } else {
      this.provider = new ConsoleVoiceProvider();
    }
  }

  async bridgeCall(fromPhone: string, toPhone: string, appointmentId: string): Promise<string> {
    return this.provider.initiateCall(fromPhone, toPhone, appointmentId);
  }
}

export const voiceService = new VoiceService();
