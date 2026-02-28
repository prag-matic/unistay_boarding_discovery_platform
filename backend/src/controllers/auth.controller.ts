import type { Request, Response, NextFunction} from 'express';
import { prisma } from '@/lib/prisma.js';
import bcrypt  from 'bcryptjs'
import { config } from '@/config/env.js';
import { Role } from '@prisma/client';
import { generateSecureToken, sha256 } from '@/lib/hash.js';
import { sendVerificationEmail } from '@/lib/email.js';
import { sendSuccess } from '@/lib/response.js'
import { sanitizeUser } from '@/utils/index.js';
import { signAccessToken, parseDurationMs } from '@/lib/jwt.js';

// zod validator types
import {
    type RegisterInput, 
    type LoginInput, 
    type RefreshTokenInput 
} from '@/schemas/auth.validators.js';

// Error Imports
import { 
    UserAlreadyExistsError,
    InvalidCredentialError,
    AccountDeactivatedError,
    UnauthorizedError,
    UserNotFoundError,
} from '@/errors/AppError.js';
import { access } from 'fs';

// POST /api/auth/register
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const body = req.body as RegisterInput;

        // check if there is any existing user
        const existing = await prisma.user.findUnique({
            where: {email: body.email}
        })

        if (existing) throw new UserAlreadyExistsError();

        // hashing the password
        const passwordHash = await bcrypt.hash(body.password, config.saltRounds);

        // create new user with prisma
        const newUser = await prisma.user.create({
            data: {
                email: body.email,
                passwordHash,
                firstName: body.firstName,
                lastName: body.lastName,
                role: body.role as Role,
                phone: body.phone,
                university: body.university,
                nicNumber: body.nicNumber,
            }
        });

        const rawToken = generateSecureToken();
        const expiresAt = new Date(Date.now() + config.emailVerficationTokenExpiry);

        // create the email verification token for the user in DB
        await prisma.emailVerificationToken.create({
            data: {
                token: rawToken,
                userId: newUser.id,
                expiresAt
            }
        });

        // send email verfication email to the new user
        try{
            await sendVerificationEmail(newUser.email, newUser.firstName, rawToken); 
        } catch (emailErr) {
            console.error('[Email] Failed to Send Email Verification email', emailErr);
        }

        sendSuccess(
            res,
            sanitizeUser(newUser),
            "Registration successful. Please check your email to verify your account.",
            201,
        );

        } catch (error) {
            next(error);

    }
}

// POST /api/auth/login
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { email, password } = req.body as LoginInput;

        const loginUser = await prisma.user.findUnique({
            where: { email }
        });

        if (!loginUser) throw new InvalidCredentialError();

        const passwordMatch = await bcrypt.compare(password, loginUser.passwordHash);
        if (!passwordMatch) throw new InvalidCredentialError();

        if (!loginUser.isActive) throw new AccountDeactivatedError();

        // Generate Tokens
        const payload = { userId: loginUser.id, role: loginUser.role, email: loginUser.email };
        const accessToken = signAccessToken(payload);

        // Generate Refresh Token
        const rawRefreshToken = generateSecureToken(48);
        const refreshTokenHash = sha256(rawRefreshToken);
        const expiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiry));

        await prisma.refreshToken.create({
            data: {
                tokenHash: refreshTokenHash,
                userId: loginUser.id,
                expiresAt
            }
        });
        
        sendSuccess(res, {
            accessToken,
            refreshToken: rawRefreshToken,
            user: {
                id: loginUser.id,
                email: loginUser.email,
                firstName: loginUser.firstName,
                lastName: loginUser.lastName,
                role: loginUser.role,
                isVerified: loginUser.isVerified,
            },
        });

        } catch (error) {
            next();
    }
}

// POST /api/auth/refresh
export async function refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const {refreshToken} = req.body as RefreshTokenInput;

        //hashing the refresh token
        const tokenHash = sha256(refreshToken);
        const stored = await prisma.refreshToken.findUnique({
            where: { tokenHash }
        });

        if (!stored || stored.revokedAt !== null) {
            throw new UnauthorizedError('Refresh Token is Invalid or Revoked');
        }

        // revoked old token and issue new one
        const user = await prisma.user.findUnique({
            where: { id: stored.userId }
        });

        if (!user) throw new UserNotFoundError();
        if (!user.isActive) throw new AccountDeactivatedError();

        const rawRefreshToken = generateSecureToken(48);
        const newTokenHash = sha256(rawRefreshToken);
        const newExpiresAt = new Date(Date.now() + parseDurationMs(config.jwt.refreshExpiry));

        await prisma.$transaction(async (tx) => {

            // store new refresh token in the DB
            const newRt = await tx.refreshToken.create({
                data: {tokenHash: newTokenHash, userId: user.id, expiresAt: newExpiresAt}
            });

            //revoke the Old refresh Token
            await tx.refreshToken.update({
                where: { id: stored.id },
                data: { revokedAt: new Date(), replacedByTokenId: newRt.id }
            });

        });

        const newAccessToken = signAccessToken({ userId: user.id, role: user.role, email: user.email });

        sendSuccess(res, {
            accessToken: newAccessToken,
            refreshToken: rawRefreshToken,
        });

    } catch (Error) {
        next(Error);
    }
}

