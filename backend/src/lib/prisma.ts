// Legacy compatibility shim for tests that still mock '@/lib/prisma.js'.
// The application now uses Mongoose models directly.

const prisma = {} as const;

export default prisma;
export { prisma };