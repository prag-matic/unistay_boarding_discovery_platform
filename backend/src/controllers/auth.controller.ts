import type { Request, Response, NextFunction} from 'express';
import { prisma } from '@/lib/prisma.js';
import bcrypt  from 'bcryptjs'
import { config } from '@/config/env.js';
import { Role } from '@prisma/client';
import { generateSecureToken } from '@/lib/hash.js';
import { sendVerificationEmail } from '@/lib/email.js';
import { sendSuccess } from '@/lib/response.js'
import { sanitizeUser } from '@/utils/index.js';
import { type RegisterInput, type LoginInput } from '@/schemas/auth.validators.js';

// Error Imports
import { 
    UserAlreadyExistsError,
    InvalidCredentialError,
    AccountDeactivatedError,
} from '@/errors/AppError.js';

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

    } catch (error) {

    }
    
}

