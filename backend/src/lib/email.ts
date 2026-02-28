import { config } from '@/config/env.js';
import nodemailer from 'nodemailer';

function createTransporter() {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: false,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
}

export async function sendVerificationEmail(
    to: string,
    firstName: string,
    token: string
): Promise<void> {

    // check if env is configured
    if (!config.smtp.user || !config.smtp.pass) {
        console.warn('[Email] SMTP not configured: skipping verification email');
        return;
    }

    const verifyUrl = `${config.appUrl}/api/auth/verify-email?token=${token}`;
    const transporter = createTransporter();

  await transporter.sendMail({
    from: `"UniStay" <${config.smtp.user}>`,
    to,
    subject: 'Verify your email – UniStay',
    html: `
      <h2>Welcome to UniStay, ${firstName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>This link expires in 24 hours.</p>
    `
  });

}