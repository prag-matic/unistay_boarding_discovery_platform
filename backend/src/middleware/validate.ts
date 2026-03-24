import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";
import { sendError } from "@/lib/response.js";

type ValidationTarget = "body" | "query" | "params";

export function validate(schema: z.ZodType, target: ValidationTarget = "body") {
	return (req: Request, res: Response, next: NextFunction): void => {
		const input = req[target];
		const result = schema.safeParse(input);

		if (!result.success) {
			const details = result.error.issues.map((e) => ({
				field: e.path.join("."),
				message: e.message,
			}));

			sendError(res, "ValidationError", "Validation failed", 422, details);
			return;
		}

		if (target === "body") {
			req.body = result.data;
			next();
			return;
		}

		if (target === "query") {
			Object.defineProperty(req, "query", {
				value: result.data,
				writable: true,
				configurable: true,
				enumerable: true,
			});

			next();
			return;
		}

		if (target === "params") {
			Object.defineProperty(req, "params", {
				value: result.data,
				writable: true,
				configurable: true,
				enumerable: true,
			});

			next();
			return;
		}

		const current = req[target] as Record<string, unknown>;
		const parsed = result.data as Record<string, unknown>;

		for (const key of Object.keys(current)) {
			delete current[key];
		}

		Object.assign(current, parsed);

		next();
	};
}

export function validateBody(schema: z.ZodType) {
	return validate(schema, "body");
}

export function validateQuery(schema: z.ZodType) {
	return validate(schema, "query");
}

export function validateParams(schema: z.ZodType) {
	return validate(schema, "params");
}
