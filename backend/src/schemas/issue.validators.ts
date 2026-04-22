import { z } from "zod";

// MongoDB ObjectId regex (24 character hex string)
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const objectIdSchema = (errorMessage: string) =>
  z.string().regex(objectIdRegex, errorMessage);

export const createIssueSchema = z.object({
  roomId: objectIdSchema("Invalid room ID format"),
  messageId: objectIdSchema("Invalid message ID format"),
  reason: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  category: z.string().optional(),
});

export const updateIssueSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  assignedTo: objectIdSchema("Invalid assigned user ID format").optional(),
  resolutionNotes: z.string().max(1000).optional(),
});

export const getIssuesSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  roomId: objectIdSchema("Invalid room ID format").optional(),
  cursor: objectIdSchema("Invalid cursor ID format").optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export const analyzeMessageSchema = z.object({
  roomId: objectIdSchema("Invalid room ID format"),
  messageId: objectIdSchema("Invalid message ID format"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type GetIssuesInput = z.infer<typeof getIssuesSchema>;
export type AnalyzeMessageInput = z.infer<typeof analyzeMessageSchema>;
