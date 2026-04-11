import { Router as createRouter, type Router } from "express";
import {
	analyzeMessage,
	createIssue,
	deleteIssue,
	getIssue,
	getIssues,
	updateIssue,
} from "@/controllers/issue.controller.js";
import { authenticate } from "@/middleware/auth.js";
import { validateBody, validateQuery } from "@/middleware/validate.js";
import {
	analyzeMessageSchema,
	createIssueSchema,
	getIssuesSchema,
	updateIssueSchema,
} from "@/schemas/issue.validators.js";

const router: Router = createRouter();

// All routes require authentication
router.use(authenticate);

// POST /api/issues - Create a new issue from chat
router.post("/", validateBody(createIssueSchema), createIssue);

// GET /api/issues - Get all issues for the authenticated user
router.get("/", validateQuery(getIssuesSchema), getIssues);

// GET /api/issues/:id - Get a specific issue
router.get("/:id", getIssue);

// PUT /api/issues/:id - Update an issue
router.put("/:id", validateBody(updateIssueSchema), updateIssue);

// DELETE /api/issues/:id - Delete an issue
router.delete("/:id", deleteIssue);

// POST /api/issues/analyze - Analyze a message without creating an issue
router.post("/analyze", validateBody(analyzeMessageSchema), analyzeMessage);

export default router;
