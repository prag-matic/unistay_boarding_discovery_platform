import { z } from "zod";

export const createIssueSchema = z.object({
	roomId: z.string().cuid2(),
	messageId: z.string().cuid2(),
	reason: z.string().optional(),
	title: z.string().min(1).max(200).optional(),
	description: z.string().min(1).max(2000).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	category: z.string().optional(),
});

export const updateIssueSchema = z.object({
	status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	assignedTo: z.string().cuid2().optional(),
	resolutionNotes: z.string().max(1000).optional(),
});

export const getIssuesSchema = z.object({
	status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
	priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
	roomId: z.string().cuid2().optional(),
	cursor: z.string().cuid2().optional(),
	limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const analyzeMessageSchema = z.object({
	roomId: z.string().cuid2(),
	messageId: z.string().cuid2(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type GetIssuesInput = z.infer<typeof getIssuesSchema>;
export type AnalyzeMessageInput = z.infer<typeof analyzeMessageSchema>;
