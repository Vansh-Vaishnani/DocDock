export interface IEmailProvider {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
}

export interface ISmsProvider {
  sendSms(to: string, body: string): Promise<void>;
}

export interface IPushProvider {
  sendPush(userId: string, title: string, body: string): Promise<void>;
}

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';
