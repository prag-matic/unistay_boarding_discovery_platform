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

		if (!stored || stored.revokedAt !== null) {
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

		const session = await User.startSession();
		session.startTransaction();

		try {
			// Store new refresh token in the DB
			const newRt = await RefreshToken.create(
				[
					{
						tokenHash: newTokenHash,
						userId: user._id,
						expiresAt: newExpiresAt,
					},
				],
				{ session },
			);

			// Revoke the old refresh token
			await RefreshToken.findByIdAndUpdate(
				stored._id,
				{
					revokedAt: new Date(),
					replacedByTokenId: newRt[0]._id,
				},
				{ session },
			);

			await session.commitTransaction();

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
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
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

		await RefreshToken.updateMany(
			{ tokenHash, revokedAt: null },
			{ revokedAt: new Date() },
		);

		sendSuccess(res, null, "Logged Out Successfully");
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

		const session = await User.startSession();
		session.startTransaction();

		try {
			await User.findByIdAndUpdate(
				record.userId,
				{ isVerified: true },
				{ session },
			);
			await EmailVerificationToken.findByIdAndDelete(record._id);
			await session.commitTransaction();

			sendSuccess(res, null, "Email Verified Successfully");
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
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

		const session = await User.startSession();
		session.startTransaction();

		try {
			await User.findByIdAndUpdate(
				record.userId,
				{ passwordHash },
				{ session },
			);
			await PasswordResetToken.findByIdAndUpdate(
				record._id,
				{ used: true },
				{ session },
			);
			await RefreshToken.updateMany(
				{ userId: record.userId, revokedAt: null },
				{ revokedAt: new Date() },
				{ session },
			);

			await session.commitTransaction();

			sendSuccess(res, null, "Password Reset Successfully");
		} catch (error) {
			await session.abortTransaction();
			throw error;
		} finally {
			session.endSession();
		}
	} catch (error) {
		next(error);
	}
}
