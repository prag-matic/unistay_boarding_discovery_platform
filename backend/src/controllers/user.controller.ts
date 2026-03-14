import type { Request, Response, NextFunction  } from "express";
import type { User } from '@prisma/client'
import { prisma } from '@/lib/prisma.js'
import { uploadProfileImage } from '@/lib/cloudinary.js'

import { 
    UnauthorizedError, 
    UserNotFoundError, 
    InvalidCredentialsError,
    ValidationError
} from "@/errors/AppError.js";

import bcrypt from "bcryptjs";
import { sendSuccess } from "@/lib/response.js";
import type { UpdateUserInput } from "@/schemas/index.js";
import type { ChangePasswordInput } from "@/schemas/user.validators.js";
import { config } from "@/config/env.js";

function sanitizeUser(user: User) {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
}

// GET /api/users/me
export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    
    try {
        if (!req.user) throw new UnauthorizedError();

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) throw new UserNotFoundError();

        sendSuccess(res, sanitizeUser(user));

    } catch (error) {
        next(error);

    }
}

// PUT /api/users/me
export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) throw new UnauthorizedError();

        const body = req.body as UpdateUserInput;

        const user = await prisma.user.update({
            where: { id: req.user.userId },
            data: {
            ...(body.firstName !== undefined && { firstName: body.firstName }),
            ...(body.lastName !== undefined && { lastName: body.lastName }),
            ...(body.phone !== undefined && { phone: body.phone }),
            ...(body.university !== undefined && { university: body.university }),
            ...(body.nicNumber !== undefined && { nicNumber: body.nicNumber }),
            },
        });

        sendSuccess(res, sanitizeUser(user), 'Profile Updated Successfully');
    
    } catch (error) {
        next(error);
    }

}

// PUT /api/users/me/password
export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) throw new UnauthorizedError();

        const { currentPassword, newPassword } = req.body as ChangePasswordInput;

        const user = await prisma.user.findUnique({
            where: { id: req.user.userId }
        });

        if (!user) throw new UserNotFoundError();        

        const match = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!match) throw new InvalidCredentialsError('Current password is incorrect');

        const newPasswordHash = await bcrypt.hash(newPassword, config.saltRounds);

        await prisma.user.update({
            where: { id: user.id}, 
            data: { passwordHash: newPasswordHash }
        })

        sendSuccess(res, null, "Password Changed Successfully");

    } catch (error) {
        next(error);
    }
}

// PUT /api/users/me/profile-image
export async function uploadProfileImageHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (!req.user) throw new UnauthorizedError();
        if (!req.file) throw new ValidationError("Validation Error", "No Image File Provided");

        const imageUrl = await uploadProfileImage(req.file.buffer, req.file.mimetype);

            const user = await prisma.user.update({
                where: { id: req.user.userId },
                data: { profileImageUrl: imageUrl },
            });

        sendSuccess(res, { profileImageUrl: user.profileImageUrl }, 'Profile image updated');
    } catch (error) {
        next(error);
    }
}