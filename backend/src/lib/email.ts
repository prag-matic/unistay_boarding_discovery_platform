import nodemailer from "nodemailer";
import { config } from "@/config/env.js";

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
	token: string,
): Promise<void> {
	// check if env is configured
	if (!config.smtp.user || !config.smtp.pass) {
		console.warn("[Email] SMTP not configured: skipping verification email");
		return;
	}

	const verifyUrl = `${config.appUrl}/api/auth/verify-email?token=${token}`;
	const transporter = createTransporter();

	await transporter.sendMail({
		from: `"UniStay" <${config.smtp.user}>`,
		to,
		subject: "Verify your email - UniStay",
		html: `
            <h2>Welcome to UniStay, ${firstName}!</h2>
            <p>Please verify your email address by clicking the link below:</p>
            <a href="${verifyUrl}">${verifyUrl}</a>
            <p>This link expires in 24 hours.</p>
        `,
	});
}

export async function sendPasswordResetEmail(
	to: string,
	firstName: string,
	token: string,
): Promise<void> {
	if (!config.smtp.user || !config.smtp.pass) {
		console.warn("[Email] SMTP not configured - skipping password reset email");
		return;
	}

	const resetUrl = `${config.appUrl}/reset-password?token=${token}`;
	const transporter = createTransporter();

	await transporter.sendMail({
		from: `"UniStay" <${config.smtp.user}>`,
		to,
		subject: "Reset your password - UniStay",
		html: `
            <h2>Password Reset Request</h2>
            <p>Hi ${firstName},</p>
            <p>Click the link below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}">${resetUrl}</a>
            <p>If you did not request this, please ignore this email.</p>
        `,
	});
}
