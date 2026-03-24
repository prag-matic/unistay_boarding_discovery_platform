import { z } from "zod";
import { BoardingAmenityType } from "@/types/enums.js";

// Gender enum schema
export const genderSchema = z.enum([
	"MALE",
	"FEMALE",
	"OTHER",
	"PREFER_NOT_TO_SAY",
]);

// User role schema
export const userRoleSchema = z.enum(["STUDENT", "OWNER"]);

// Base user schema (common fields for both students and owners)
export const baseUserSchema = z.object({
	firstName: z.string().min(1, "First name is required").max(50),
	lastName: z.string().min(1, "Last name is required").max(50),
	email: z.string().email("Invalid email address"),
	phone: z.string().optional(),
	nicNumber: z.string().optional(),
	gender: genderSchema.optional(),
	dateOfBirth: z.string().datetime().optional().or(z.date().optional()),
});

// Student-specific schema
export const studentSchema = baseUserSchema.extend({
	role: userRoleSchema.default("STUDENT"),
	university: z.string().optional(),
	studyYear: z.number().int().min(1).max(5).optional(),
	degree: z.string().optional(),
});

// Owner-specific schema
export const ownerSchema = baseUserSchema.extend({
	role: userRoleSchema.default("OWNER"),
});

// User creation schemas
export const createStudentSchema = studentSchema;
export const createOwnerSchema = ownerSchema;

// User update schema (all fields optional)
export const updateUserSchema = baseUserSchema.partial().extend({
	university: z.string().optional(),
	studyYear: z.number().int().min(1).max(5).optional(),
	degree: z.string().optional(),
	role: userRoleSchema.optional(),
});

// Boarding type schema
export const boardingTypeSchema = z.enum([
	"SINGLE",
	"DOUBLE",
	"TRIPLE",
	"QUAD",
	"STUDIO",
	"APARTMENT",
	"DORMITORY",
	"OTHER",
]);

export const boardingAmenitySchema = z.enum(Object.values(BoardingAmenityType));

// Boarding schema
export const boardingSchema = z.object({
	propertyName: z.string().min(1, "Property name is required").max(100),
	type: boardingTypeSchema,
	address: z.string().min(1, "Address is required"),
	city: z.string().optional(),
	state: z.string().optional(),
	zipCode: z.string().optional(),
	description: z.string().optional(),
	amenities: z.array(boardingAmenitySchema).optional(),
	price: z.number().positive().optional(),
	available: z.boolean().default(true),
});

// Boarding creation schema
export const createBoardingSchema = boardingSchema;

// Boarding update schema (all fields optional)
export const updateBoardingSchema = boardingSchema.partial();

// Review schema
export const reviewSchema = z.object({
	boardingId: z
		.string()
		.min(1, "boardingId is required")
		.refine(
			(val) => {
				// Accept either cuid or MongoDB ObjectId format
				return (
					val.length === 24 && /^[0-9a-fA-F]{24}$/.test(val) // ObjectId
				);
			},
			{ message: "Invalid boarding ID" },
		),
	rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
	comment: z.string().max(1000).optional().nullable(),
	images: z
		.array(z.string().url())
		.max(5, "Maximum 5 images allowed")
		.optional()
		.default([]),
	video: z.string().url().optional().nullable(),
});
export const createReviewSchema = reviewSchema;

// Review update schema (one-time edit)
export const updateReviewSchema = reviewSchema.partial();

// Review comment schema
export const reviewCommentSchema = z.object({
	reviewId: z.string().cuid("Invalid review ID"),
	comment: z.string().min(1, "Comment is required").max(500),
});

// Review comment creation schema (only comment field, reviewId passed separately)
export const createReviewCommentSchema = z.object({
	comment: z.string().min(1, "Comment is required").max(500),
});

// Review comment update schema (one-time edit) - only comment field needed
export const updateReviewCommentSchema = z.object({
	comment: z.string().min(1, "Comment is required").max(500),
});

// Reaction schema
export const reactionTypeSchema = z.enum(["LIKE", "DISLIKE"]);

export const reactionSchema = z.object({
	type: reactionTypeSchema,
});

// Export types
export type Gender = z.infer<typeof genderSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
export type BoardingType = z.infer<typeof boardingTypeSchema>;
export type ReactionType = z.infer<typeof reactionTypeSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type CreateOwnerInput = z.infer<typeof createOwnerSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateBoardingInput = z.infer<typeof createBoardingSchema>;
export type UpdateBoardingInput = z.infer<typeof updateBoardingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;
export type CreateReviewCommentInput = z.infer<
	typeof createReviewCommentSchema
>;
export type UpdateReviewCommentInput = z.infer<
	typeof updateReviewCommentSchema
>;
export type ReactionInput = z.infer<typeof reactionSchema>;
