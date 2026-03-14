import prisma from '@/lib/prisma.js';
import { AppError } from '@/errors/AppError.js';

function toKebabCase(str: string): string {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/[\s-]+/g, '-');
}

function randomSuffix(): string {
    return Math.random().toString(36).slice(2, 8);
}

export function buildSlug(title: string): string {
    return `${toKebabCase(title)}-${randomSuffix()}`;
}

export async function generateUniqueSlug(title: string, excludeId?: string): Promise<string> {
    let slug = buildSlug(title);
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
        const existing = await prisma.boarding.findUnique({ where: { slug } });

        if (!existing || existing.id === excludeId) {
            return slug;
        }

        slug = buildSlug(title);
        attempts++;
    }

    throw new AppError('Could not generate a unique slug after multiple attempts', 409);
    
}
