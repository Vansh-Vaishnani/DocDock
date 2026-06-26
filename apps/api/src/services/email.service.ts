import type { MailDataRequired } from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@docdock.com';
let sgMailClient: { setApiKey: (key: string) => void; send: (msg: MailDataRequired | MailDataRequired[]) => Promise<unknown>; } | null = null;

const getSendGridClient = async () => {
  if (!SENDGRID_API_KEY) {
    throw new Error('SendGrid API key is not configured.');
  }

  if (!sgMailClient) {
    const sgMailModule = await import('@sendgrid/mail');
    sgMailClient = sgMailModule.default ?? sgMailModule;
    sgMailClient.setApiKey(SENDGRID_API_KEY);
  }

  return sgMailClient;
};

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a basic email
 */
export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<void> => {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.');
    return;
  }

  const sgMail = await getSendGridClient();
  const msg: MailDataRequired = {
    to,
    from: FROM_EMAIL,
    subject,
    html,
    ...(text && { text })
  };

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${to}`);
  } catch (error) {
    console.error('SendGrid error:', error);
    throw error;
  }
};

/**
 * Send email verification code
 */
export const sendVerificationEmail = async (email: string, code: string, name: string): Promise<void> => {
  const html = `
    <h2>Welcome to DocDock, ${name}!</h2>
    <p>Please verify your email address to complete your registration.</p>
    <p>Your verification code is:</p>
    <h3 style="font-family: monospace; letter-spacing: 0.1em;">${code}</h3>
    <p>This code will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  const text = `
Welcome to DocDock, ${name}!

Please verify your email address to complete your registration.

Your verification code is: ${code}

This code will expire in 24 hours.

If you didn't request this, please ignore this email.
  `;

  await sendEmail(email, 'Email Verification - DocDock', html, text);
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string, name: string): Promise<void> => {
  const resetLink = `${process.env.APP_URL}/auth/reset-password?token=${resetToken}`;

  const html = `
    <h2>Password Reset Request</h2>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. Click the link below to set a new password:</p>
    <p><a href="${resetLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
  `;

  const text = `
Password Reset Request

Hi ${name},

We received a request to reset your password. Visit the link below to set a new password:

${resetLink}

This link will expire in 1 hour.

If you didn't request this, please ignore this email and your password will remain unchanged.
  `;

  await sendEmail(email, 'Password Reset - DocDock', html, text);
};

/**
 * Send appointment confirmation email
 */
export const sendAppointmentConfirmationEmail = async (
  email: string,
  appointmentDetails: {
    doctorName: string;
    date: string;
    time: string;
    specialty: string;
    patientName: string;
  }
): Promise<void> => {
  const html = `
    <h2>Appointment Confirmed!</h2>
    <p>Hi ${appointmentDetails.patientName},</p>
    <p>Your appointment has been confirmed with the following details:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold; width: 150px;">Doctor:</td>
        <td style="padding: 10px;">${appointmentDetails.doctorName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold;">Specialty:</td>
        <td style="padding: 10px;">${appointmentDetails.specialty}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px; font-weight: bold;">Date:</td>
        <td style="padding: 10px;">${appointmentDetails.date}</td>
      </tr>
      <tr>
        <td style="padding: 10px; font-weight: bold;">Time:</td>
        <td style="padding: 10px;">${appointmentDetails.time}</td>
      </tr>
    </table>
    <p>Please arrive 5-10 minutes before your appointment time.</p>
  `;

  const text = `
Appointment Confirmed!

Hi ${appointmentDetails.patientName},

Your appointment has been confirmed with the following details:

Doctor: ${appointmentDetails.doctorName}
Specialty: ${appointmentDetails.specialty}
Date: ${appointmentDetails.date}
Time: ${appointmentDetails.time}

Please arrive 5-10 minutes before your appointment time.
  `;

  await sendEmail(
    email,
    'Appointment Confirmation - DocDock',
    html,
    text
  );
};

/**
 * Send appointment cancellation email
 */
export const sendAppointmentCancellationEmail = async (
  email: string,
  appointmentDetails: {
    doctorName: string;
    patientName: string;
  }
): Promise<void> => {
  const html = `
    <h2>Appointment Cancelled</h2>
    <p>Hi ${appointmentDetails.patientName},</p>
    <p>Your appointment with Dr. ${appointmentDetails.doctorName} has been cancelled.</p>
    <p>If you wish to reschedule, please visit your account or contact us directly.</p>
  `;

  const text = `
Appointment Cancelled

Hi ${appointmentDetails.patientName},

Your appointment with Dr. ${appointmentDetails.doctorName} has been cancelled.

If you wish to reschedule, please visit your account or contact us directly.
  `;

  await sendEmail(
    email,
    'Appointment Cancelled - DocDock',
    html,
    text
  );
};

/**
 * Send doctor verification status email
 */
export const sendDoctorVerificationEmail = async (
  email: string,
  name: string,
  status: 'approved' | 'rejected',
  reason?: string
): Promise<void> => {
  const isApproved = status === 'approved';
  const subject = isApproved
    ? 'Your Doctor Account Has Been Approved!'
    : 'Your Doctor Account Verification';

  const html = `
    <h2>${isApproved ? 'Welcome!' : 'Verification Update'}</h2>
    <p>Hi ${name},</p>
    ${
      isApproved
        ? `<p>Great news! Your doctor account has been verified and approved.</p>
           <p>You can now log in and start accepting appointments.</p>`
        : `<p>Thank you for your submission. Your account has been under review.</p>
           <p>Status: ${status}</p>
           ${reason ? `<p>Reason: ${reason}</p>` : ''}`
    }
  `;

  const text = `
${isApproved ? 'Welcome!' : 'Verification Update'}

Hi ${name},

${
  isApproved
    ? 'Great news! Your doctor account has been verified and approved. You can now log in and start accepting appointments.'
    : `Thank you for your submission. Your account has been under review.
Status: ${status}
${reason ? `Reason: ${reason}` : ''}`
}
  `;

  await sendEmail(email, subject, html, text);
};

/**
 * Check if email service is enabled
 */
export const isEmailServiceEnabled = (): boolean => {
  return !!SENDGRID_API_KEY;
};
