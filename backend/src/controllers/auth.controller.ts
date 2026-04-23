import bcrypt from "bcryptjs";
import type { NextFunction, Request, Response } from "express";
import { config } from "@/config/env.js";
// Error Imports
import {
	AccountDeactivatedError,
	InvalidCredentialsError,
	TokenExpiredError,
	UnauthorizedError,
	UserAlreadyExistsError,
	UserNotFoundError,
} from "@/errors/AppError.js";
import { sendPasswordResetEmail, sendVerificationEmail } from "@/lib/email.js";
import { generateSecureToken, sha256 } from "@/lib/hash.js";
import { parseDurationMs, signAccessToken } from "@/lib/jwt.js";
import { withMongoTransaction } from "@/lib/mongodb.js";
import { sendSuccess } from "@/lib/response.js";
import {
	EmailVerificationToken,
	PasswordResetToken,
	RefreshToken,
	User,
} from "@/models/index.js";
// zod validator types
import type {
	ForgotPasswordInput,
	LoginInput,
	LogoutInput,
	RefreshTokenInput,
	RegisterInput,
	ResendVerificationInput,
	ResetPasswordInput,
} from "@/schemas/auth.validators.js";
import type { Role } from "@/types/enums.js";
import { sanitizeUser } from "@/utils/index.js";

// POST /api/auth/register
export async function register(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const body = req.body as RegisterInput;

		// Check if there is any existing user
		const existing = await User.findOne({ email: body.email });

		if (existing) throw new UserAlreadyExistsError();

		// Hashing the password
		const passwordHash = await bcrypt.hash(body.password, config.saltRounds);

		// Create new user
		const newUser = await User.create({
			email: body.email,
			passwordHash,
			firstName: body.firstName,
			lastName: body.lastName,
			role: body.role as Role,
			phone: body.phone,
			university: body.university,
			nicNumber: body.nicNumber,
		});

		const rawToken = generateSecureToken();
		const expiresAt = new Date(Date.now() + config.emailVerficationTokenExpiry);

		// Create the email verification token for the user in DB
		await EmailVerificationToken.create({
			token: rawToken,
			userId: newUser._id,
			expiresAt,
		});

		// Send email verification email to the new user
		try {
			await sendVerificationEmail(newUser.email, newUser.firstName, rawToken);
		} catch (emailErr) {
			console.error(
				"[Email] Failed to Send Email Verification email",
				emailErr,
			);
		}

		sendSuccess(
			res,
			sanitizeUser(newUser.toObject() as unknown as Record<string, unknown>),
			"Registration successful. Please check your email to verify your account.",
			201,
		);
	} catch (error) {
		next(error);
	}
}

// POST /api/auth/login
export async function login(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { email, password } = req.body as LoginInput;

		const loginUser = await User.findOne({ email });

		if (!loginUser) throw new InvalidCredentialsError();

		const passwordMatch = await bcrypt.compare(
			password,
			loginUser.passwordHash,
		);
		if (!passwordMatch) throw new InvalidCredentialsError();

		if (!loginUser.isActive) throw new AccountDeactivatedError();

		// Generate Tokens
		const payload = {
			userId: loginUser._id.toString(),
			role: loginUser.role,
			email: loginUser.email,
		};
		const accessToken = signAccessToken(payload);

		// Generate Refresh Token
		const rawRefreshToken = generateSecureToken(48);
		const refreshTokenHash = sha256(rawRefreshToken);
		const expiresAt = new Date(
			Date.now() + parseDurationMs(config.jwt.refreshExpiry),
		);

		await RefreshToken.create({
			tokenHash: refreshTokenHash,
			userId: loginUser._id,
			expiresAt,
		});

		sendSuccess(res, {
			accessToken,
			refreshToken: rawRefreshToken,
			user: {
				id: loginUser._id.toString(),
				email: loginUser.email,
				firstName: loginUser.firstName,
				lastName: loginUser.lastName,
				role: loginUser.role,
				isVerified: loginUser.isVerified,
				isActive: loginUser.isActive,
				phone: loginUser.phone,
				university: loginUser.university,
				nicNumber: loginUser.nicNumber,
				profileImageUrl: loginUser.profileImageUrl,
				createdAt: loginUser.createdAt.toISOString(),
				updatedAt: loginUser.updatedAt.toISOString(),
			},
		});
	} catch (error) {
		next(error);
	}
}

// POST /api/auth/refresh
export async function refreshToken(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { refreshToken } = req.body as RefreshTokenInput;

		// Hashing the refresh token
		const tokenHash = sha256(refreshToken);
		const stored = await RefreshToken.findOne({ tokenHash });

		if (!stored || stored.revokedAt != null) {
			throw new UnauthorizedError("Refresh Token is Invalid or Revoked");
		}

		// Revoke old token and issue new one
		const user = await User.findById(stored.userId);

		if (!user) throw new UserNotFoundError();
		if (!user.isActive) throw new AccountDeactivatedError();

		const rawRefreshToken = generateSecureToken(48);
		const newTokenHash = sha256(rawRefreshToken);
		const newExpiresAt = new Date(
			Date.now() + parseDurationMs(config.jwt.refreshExpiry),
		);

		await withMongoTransaction(async (session) => {
			// Store new refresh token in the DB
			const newRt = await RefreshToken.create(
				[
					{
						tokenHash: newTokenHash,
						userId: user._id,
						expiresAt: newExpiresAt,
					},
				],
				session ? { session } : {},
			);

			// Revoke the old refresh token
			await RefreshToken.findByIdAndUpdate(
				stored._id,
				{
					revokedAt: new Date(),
					replacedByTokenId: newRt[0]._id,
				},
				session ? { session } : {},
			);
		});

		const newAccessToken = signAccessToken({
			userId: user._id.toString(),
			role: user.role,
			email: user.email,
		});

		sendSuccess(res, {
			accessToken: newAccessToken,
			refreshToken: rawRefreshToken,
		});
	} catch (error) {
		next(error);
	}
}

// POST /api/auth/logout
export async function logout(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { refreshToken } = req.body as LogoutInput;
		const tokenHash = sha256(refreshToken);

		await RefreshToken.updateMany({ tokenHash }, { revokedAt: new Date() });

		sendSuccess(res, null, "Logged Out Successfully");
	} catch (error) {
		next(error);
	}
}

function wantsVerificationHtml(req: Request): boolean {
	const accept = req.headers.accept ?? "";
	return accept.includes("text/html") || req.query.format === "html";
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/\"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

function buildVerificationPage(params: {
	success: boolean;
	title: string;
	message: string;
}): string {
	const accent = params.success ? "#16a34a" : "#dc2626";
	const icon = params.success ? "✓" : "✕";
	const bodyClass = params.success ? "success" : "failure";
	const title = escapeHtml(params.title);
	const message = escapeHtml(params.message);

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta http-equiv="cache-control" content="no-store" />
	<meta http-equiv="pragma" content="no-cache" />
	<title>${title}</title>
	<style>
		:root { color-scheme: light; }
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100vh;
			display: grid;
			place-items: center;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
			color: #0f172a;
			padding: 24px;
		}
		.card {
			width: min(100%, 560px);
			background: rgba(255, 255, 255, 0.96);
			border: 1px solid rgba(148, 163, 184, 0.24);
			border-radius: 24px;
			box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
			padding: 40px 32px;
			text-align: center;
			backdrop-filter: blur(10px);
		}
		.badge {
			width: 84px;
			height: 84px;
			margin: 0 auto 20px;
			border-radius: 999px;
			display: grid;
			place-items: center;
			font-size: 44px;
			font-weight: 800;
			color: white;
			background: ${accent};
			box-shadow: 0 18px 30px rgba(${params.success ? "22, 163, 74" : "220, 38, 38"}, 0.22);
		}
		h1 {
			margin: 0 0 12px;
			font-size: clamp(1.8rem, 4vw, 2.5rem);
			line-height: 1.1;
		}
		p {
			margin: 0;
			color: #475569;
			font-size: 1rem;
			line-height: 1.7;
		}
		.subtle {
			margin-top: 18px;
			font-size: 0.92rem;
			color: #64748b;
		}
		.status {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 8px 14px;
			margin-bottom: 18px;
			border-radius: 999px;
			background: ${params.success ? "rgba(22, 163, 74, 0.1)" : "rgba(220, 38, 38, 0.1)"};
			color: ${accent};
			font-size: 0.88rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
		@media (max-width: 480px) {
			.card { padding: 32px 22px; border-radius: 20px; }
		}
	</style>
</head>
<body class="${bodyClass}">
	<main class="card" role="main" aria-live="polite">
		<div class="status">Email Verification</div>
		<div class="badge" aria-hidden="true">${icon}</div>
		<h1>${title}</h1>
		<p>${message}</p>
		<div class="subtle">
			${params.success ? "Your email has been verified. You can now sign in to your account." : "Please request a new verification link and try again."}
		</div>
	</main>
</body>
</html>`;
}

function sendVerificationPage(
	res: Response,
	statusCode: number,
	params: {
		success: boolean;
		title: string;
		message: string;
	},
): void {
	res
		.status(statusCode)
		.type("html")
		.set("Cache-Control", "no-store")
		.send(buildVerificationPage(params));
}

function buildPasswordResetPage(params: {
	mode: "forgot" | "change";
	message?: string;
	token?: string;
}): string {
	const isChangeMode = params.mode === "change";
	const title = isChangeMode ? "Change Password" : "Forgot Password";
	const statusLabel = isChangeMode ? "Password Reset" : "Account Recovery";
	const icon = isChangeMode ? "↻" : "✉";
	const accent = isChangeMode ? "#7c3aed" : "#2563eb";
	const accentRgb = isChangeMode ? "124, 58, 237" : "37, 99, 235";
	const heading = isChangeMode ? "Set a New Password" : "Forgot Password?";
	const description = isChangeMode
		? "Choose a strong new password for your account."
		: "Enter the email address associated with your account and we will send a reset link.";
	const message = params.message
		? `<div class="notice ${isChangeMode ? "notice-warn" : "notice-info"}">${escapeHtml(params.message)}</div>`
		: "";
	const formFields = isChangeMode
		? `
			<input type="hidden" id="token" value="${escapeHtml(params.token ?? "")}" />
			<label class="field">
				<span>New Password</span>
				<input id="password" name="password" type="password" minlength="8" autocomplete="new-password" placeholder="Enter a new password" required />
			</label>
			<label class="field">
				<span>Confirm New Password</span>
				<input id="confirmPassword" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" placeholder="Re-enter your password" required />
			</label>
		`
		: `
			<label class="field">
				<span>Email Address</span>
				<input id="email" name="email" type="email" autocomplete="email" placeholder="student@university.edu" required />
			</label>
		`;
	const footerNote = isChangeMode
		? "The reset link is validated before this form is shown."
		: "We will not reveal whether this email address is registered.";
	const submitLabel = isChangeMode ? "Update Password" : "Send Reset Link";
	const successText = isChangeMode
		? "Your password has been updated successfully. You can now sign in with the new password."
		: "If that email is registered, a password reset link has been sent.";
	const formId = isChangeMode ? "change-password-form" : "forgot-password-form";
	const statusId = isChangeMode ? "change-password-status" : "forgot-password-status";
	const endpoint = isChangeMode ? "/api/auth/reset-password" : "/api/auth/forgot-password";
	const handlerScript = isChangeMode
		? `
			const token = document.getElementById("token")?.value || "";
			const password = document.getElementById("password");
			const confirmPassword = document.getElementById("confirmPassword");
			form.addEventListener("submit", async (event) => {
				event.preventDefault();
				const nextPassword = String(password?.value || "");
				const repeatedPassword = String(confirmPassword?.value || "");
				if (nextPassword !== repeatedPassword) {
					setStatus("Passwords do not match.", "error");
					return;
				}
				setBusy(true);
				try {
					const response = await fetch("${endpoint}", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ token, password: nextPassword }),
					});
					const payload = await response.json().catch(() => ({}));
					if (!response.ok) {
						throw new Error(payload.message || "Unable to update password.");
					}
					setStatus(payload.message || "${successText}", "success");
					form.reset();
				} catch (error) {
					setStatus(error instanceof Error ? error.message : "An unexpected error occurred.", "error");
				} finally {
					setBusy(false);
				}
			});
		`
		: `
			const email = document.getElementById("email");
			form.addEventListener("submit", async (event) => {
				event.preventDefault();
				setBusy(true);
				try {
					const response = await fetch("${endpoint}", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ email: String(email?.value || "") }),
					});
					const payload = await response.json().catch(() => ({}));
					if (!response.ok) {
						throw new Error(payload.message || "Unable to send reset link.");
					}
					setStatus(payload.message || "${successText}", "success");
					form.reset();
				} catch (error) {
					setStatus(error instanceof Error ? error.message : "An unexpected error occurred.", "error");
				} finally {
					setBusy(false);
				}
			});
		`;

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta http-equiv="cache-control" content="no-store" />
	<meta http-equiv="pragma" content="no-cache" />
	<title>${escapeHtml(title)}</title>
	<style>
		:root { color-scheme: light; }
		* { box-sizing: border-box; }
		body {
			margin: 0;
			min-height: 100vh;
			display: grid;
			place-items: center;
			font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			background: linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%);
			color: #0f172a;
			padding: 24px;
		}
		.card {
			width: min(100%, 560px);
			background: rgba(255, 255, 255, 0.96);
			border: 1px solid rgba(148, 163, 184, 0.24);
			border-radius: 24px;
			box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12);
			padding: 40px 32px;
			backdrop-filter: blur(10px);
		}
		.hero {
			display: grid;
			justify-items: center;
			text-align: center;
			margin-bottom: 28px;
		}
		.badge {
			width: 84px;
			height: 84px;
			margin-bottom: 18px;
			border-radius: 999px;
			display: grid;
			place-items: center;
			font-size: 42px;
			font-weight: 800;
			color: white;
			background: ${accent};
			box-shadow: 0 18px 30px rgba(${accentRgb}, 0.22);
		}
		h1 {
			margin: 0 0 12px;
			font-size: clamp(1.8rem, 4vw, 2.4rem);
			line-height: 1.1;
		}
		p {
			margin: 0;
			color: #475569;
			font-size: 1rem;
			line-height: 1.7;
		}
		.status {
			display: inline-flex;
			align-items: center;
			gap: 8px;
			padding: 8px 14px;
			margin-bottom: 18px;
			border-radius: 999px;
			background: rgba(37, 99, 235, 0.1);
			color: ${accent};
			font-size: 0.88rem;
			font-weight: 700;
			text-transform: uppercase;
			letter-spacing: 0.08em;
		}
		.notice {
			margin-bottom: 18px;
			padding: 14px 16px;
			border-radius: 14px;
			font-size: 0.94rem;
			line-height: 1.6;
		}
		.notice-info {
			background: #eff6ff;
			color: #1d4ed8;
			border: 1px solid #bfdbfe;
		}
		.notice-warn {
			background: #fff7ed;
			color: #9a3412;
			border: 1px solid #fdba74;
		}
		.form {
			display: grid;
			gap: 16px;
		}
		.field {
			display: grid;
			gap: 8px;
		}
		.field span {
			font-size: 0.92rem;
			font-weight: 600;
			color: #0f172a;
		}
		.field input {
			width: 100%;
			border: 1px solid #cbd5e1;
			border-radius: 14px;
			padding: 14px 16px;
			font-size: 1rem;
			outline: none;
			transition: border-color 0.2s ease, box-shadow 0.2s ease;
			background: white;
		}
		.field input:focus {
			border-color: ${accent};
			box-shadow: 0 0 0 4px rgba(${accentRgb}, 0.12);
		}
		button {
			border: 0;
			border-radius: 14px;
			padding: 14px 18px;
			font-size: 1rem;
			font-weight: 700;
			color: white;
			background: ${accent};
			cursor: pointer;
			transition: transform 0.15s ease, opacity 0.2s ease;
		}
		button:hover { transform: translateY(-1px); }
		button:disabled { opacity: 0.7; cursor: wait; transform: none; }
		.footer {
			margin-top: 18px;
			font-size: 0.92rem;
			color: #64748b;
			text-align: center;
		}
		.message {
			margin-top: 16px;
			padding: 14px 16px;
			border-radius: 14px;
			display: none;
			font-size: 0.94rem;
			line-height: 1.6;
		}
		.message[data-state="success"] {
			display: block;
			background: rgba(22, 163, 74, 0.1);
			color: #166534;
			border: 1px solid rgba(22, 163, 74, 0.24);
		}
		.message[data-state="error"] {
			display: block;
			background: rgba(220, 38, 38, 0.1);
			color: #b91c1c;
			border: 1px solid rgba(220, 38, 38, 0.24);
		}
		.small {
			margin-top: 14px;
			font-size: 0.86rem;
			color: #64748b;
			text-align: center;
		}
		@media (max-width: 480px) {
			.card { padding: 32px 22px; border-radius: 20px; }
		}
	</style>
</head>
<body>
	<main class="card" role="main" aria-live="polite">
		<div class="hero">
			<div class="status">${statusLabel}</div>
			<div class="badge" aria-hidden="true">${icon}</div>
			<h1>${escapeHtml(heading)}</h1>
			<p>${escapeHtml(description)}</p>
		</div>
		${message}
		<form id="${formId}" class="form" novalidate>
			${formFields}
			<button id="submit-btn" type="submit">${submitLabel}</button>
		</form>
		<div id="${statusId}" class="message" role="status"></div>
		<div class="small">${escapeHtml(footerNote)}</div>
	</main>
	<script>
		(() => {
			const form = document.getElementById(${JSON.stringify(formId)});
			const statusBox = document.getElementById(${JSON.stringify(statusId)});
			const submitBtn = document.getElementById("submit-btn");
			if (!form || !statusBox || !submitBtn) return;

			const setStatus = (message, state) => {
				statusBox.textContent = message;
				statusBox.dataset.state = state;
			};

			const setBusy = (isBusy) => {
				submitBtn.disabled = isBusy;
				submitBtn.textContent = isBusy ? ${JSON.stringify(isChangeMode ? "Updating..." : "Sending...")} : ${JSON.stringify(submitLabel)};
			};

			${handlerScript}
		})();
	</script>
</body>
</html>`;
}

function sendPasswordResetPage(
	res: Response,
	statusCode: number,
	params: {
		mode: "forgot" | "change";
		message?: string;
		token?: string;
	},
): void {
	res.status(statusCode).type("html").set("Cache-Control", "no-store");
	res.set(
		"Content-Security-Policy",
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'self'; form-action 'self'",
	);
	res.send(buildPasswordResetPage(params));
}

async function resolveValidPasswordResetToken(token: string) {
	const record = await PasswordResetToken.findOne({ token });
	if (!record || record.used) return null;
	if (record.expiresAt < new Date()) {
		await PasswordResetToken.findByIdAndDelete(record._id);
		return null;
	}
	return record;
}

// GET /forgot-password
export async function serveForgotPasswordPage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		sendPasswordResetPage(res, 200, { mode: "forgot" });
	} catch (error) {
		next(error);
	}
}

// GET /reset-password?token=...
export async function serveResetPasswordLandingPage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

		if (!token) {
			sendPasswordResetPage(res, 400, {
				mode: "forgot",
				message: "This reset link is missing a token. Request a new password reset email below.",
			});
			return;
		}

		const record = await resolveValidPasswordResetToken(token);
		if (!record) {
			sendPasswordResetPage(res, 400, {
				mode: "forgot",
				message: "This reset link is invalid or expired. Request a new password reset email below.",
			});
			return;
		}

		res.redirect(302, `/change-password?token=${encodeURIComponent(token)}`);
	} catch (error) {
		next(error);
	}
}

// GET /change-password?token=...
export async function serveChangePasswordPage(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

		if (!token) {
			sendPasswordResetPage(res, 400, {
				mode: "forgot",
				message: "The reset token is missing. Request a new password reset email below.",
			});
			return;
		}

		const record = await resolveValidPasswordResetToken(token);
		if (!record) {
			sendPasswordResetPage(res, 400, {
				mode: "forgot",
				message: "This reset link is invalid or expired. Request a new password reset email below.",
			});
			return;
		}

		sendPasswordResetPage(res, 200, {
			mode: "change",
			token,
			message: "Your reset link is valid. Choose a new password below.",
		});
	} catch (error) {
		next(error);
	}
}

// GET /api/auth/verify-email?token=...
export async function verifyEmail(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const renderHtml = wantsVerificationHtml(req);
	try {
		const { token } = req.query as { token: string };
		if (!token) throw new TokenExpiredError("Verification Token is Missing");

		const record = await EmailVerificationToken.findOne({ token });

		if (!record)
			throw new TokenExpiredError("Invalid or Expired Verification Token");

		if (record.expiresAt < new Date()) {
			await EmailVerificationToken.findByIdAndDelete(record._id);
			throw new TokenExpiredError("Verification token has expired");
		}

		await withMongoTransaction(async (session) => {
			await User.findByIdAndUpdate(
				record.userId,
				{ isVerified: true },
				session ? { session } : {},
			);
			await EmailVerificationToken.findByIdAndDelete(record._id);
		});

		if (renderHtml) {
			sendVerificationPage(res, 200, {
				success: true,
				title: "Email Verified Successfully",
				message:
					"Your email address has been verified. You can now sign in to your account.",
			});
			return;
		}

		sendSuccess(res, null, "Email Verified Successfully");
	} catch (error) {
		if (renderHtml) {
			const message =
				error instanceof TokenExpiredError
					? "This verification link is invalid or has expired."
					: "We could not verify your email address.";
			const statusCode = error instanceof TokenExpiredError ? 401 : 400;
			sendVerificationPage(res, statusCode, {
				success: false,
				title: "Verification Failed",
				message,
			});
			return;
		}
		next(error);
	}
}

// GET /api/auth/resend-verification
export async function resendVerification(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { email } = req.body as ResendVerificationInput;

		const user = await User.findOne({ email });

		if (!user || user.isVerified) {
			sendSuccess(
				res,
				null,
				"If that email exists and is unverified, a new link has been sent.",
			);
			return;
		}

		// Revoke existing tokens
		await EmailVerificationToken.deleteMany({ userId: user._id });

		const rawToken = generateSecureToken();
		const expiresAt = new Date(Date.now() + config.emailVerficationTokenExpiry);

		// Create the email verification token for the user in DB
		await EmailVerificationToken.create({
			token: rawToken,
			userId: user._id,
			expiresAt,
		});

		try {
			await sendVerificationEmail(user.email, user.firstName, rawToken);
		} catch (emailErr) {
			console.error("[Email] Failed to send verification email:", emailErr);
		}

		sendSuccess(
			res,
			null,
			"If that email exists and is unverified, a new link has been sent.",
		);
	} catch (error) {
		next(error);
	}
}

// POST /api/auth/forgot-password
export async function forgotPassword(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { email } = req.body as ForgotPasswordInput;

		const user = await User.findOne({ email });

		// Always return success to prevent user enumeration
		if (!user) {
			sendSuccess(
				res,
				null,
				"If that email is registered, a password reset link has been sent.",
			);
			return;
		}

		// Invalidate existing reset tokens
		await PasswordResetToken.deleteMany({ userId: user._id });

		const rawToken = generateSecureToken();
		const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

		await PasswordResetToken.create({
			token: rawToken,
			userId: user._id,
			expiresAt,
		});

		try {
			await sendPasswordResetEmail(user.email, user.firstName, rawToken);
		} catch (emailErr) {
			console.error("[Email] Failed to send password reset email:", emailErr);
		}

		sendSuccess(
			res,
			null,
			"If that email is registered, a password reset link has been sent.",
		);
	} catch (err) {
		next(err);
	}
}

// POST /api/auth/reset-password
export async function resetPassword(
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	try {
		const { token, password } = req.body as ResetPasswordInput;

		const record = await PasswordResetToken.findOne({ token });

		if (!record || record.used)
			throw new TokenExpiredError("Invalid or expired reset token");

		if (record.expiresAt < new Date()) {
			await PasswordResetToken.findByIdAndDelete(record._id);
			throw new TokenExpiredError("Reset token has expired");
		}

		const passwordHash = await bcrypt.hash(password, config.saltRounds);

		await withMongoTransaction(async (session) => {
			await User.findByIdAndUpdate(
				record.userId,
				{ passwordHash },
				session ? { session } : {},
			);
			await PasswordResetToken.findByIdAndUpdate(
				record._id,
				{ used: true },
				session ? { session } : {},
			);
			await RefreshToken.updateMany(
				{ userId: record.userId },
				{ revokedAt: new Date() },
				session ? { session } : {},
			);
		});

		sendSuccess(res, null, "Password Reset Successfully");
	} catch (error) {
		next(error);
	}
}
