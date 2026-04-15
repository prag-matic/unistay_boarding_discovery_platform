import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
	validate,
	validateBody,
	validateParams,
	validateQuery,
} from "@/middleware/validate.js";

const schema = z.object({
	name: z.string().min(1),
	age: z.number().int().min(0),
});

function mockRes() {
	const res: Partial<Response> = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res as Response;
}
function makeReq(overrides: Partial<Request> = {}): Request {
	return {
		body: {},
		query: {},
		params: {},
		...overrides,
	} as unknown as Request;
}

describe("validate (body)", () => {
	it("calls next() and replaces body on success", () => {
		const req = makeReq({ body: { name: "Alice", age: 25 } });
		const next = vi.fn();
		validate(schema, "body")(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
		expect(req.body).toEqual({ name: "Alice", age: 25 });
	});

	it("sends 422 and does not call next() on failure", () => {
		const res = mockRes();
		const next = vi.fn();
		validate(schema, "body")(
			makeReq({ body: { name: "", age: -1 } }),
			res,
			next,
		);
		expect(next).not.toHaveBeenCalled();
		expect(res.status).toHaveBeenCalledWith(422);
		const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(body.error).toBe("ValidationError");
		expect(Array.isArray(body.details)).toBe(true);
	});
});

describe("validate (query)", () => {
	it("attaches parsed data to req.query", () => {
		const qSchema = z.object({ page: z.coerce.number().default(1) });
		const req = makeReq({ query: { page: "3" } as any });
		const next = vi.fn();
		validate(qSchema, "query")(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
		expect((req as any).query.page).toBe(3);
	});

	it("sends 422 for invalid query", () => {
		const qSchema = z.object({ status: z.enum(["open", "closed"]) });
		const res = mockRes();
		validate(qSchema, "query")(
			makeReq({ query: { status: "bad" } as any }),
			res,
			vi.fn(),
		);
		expect(res.status).toHaveBeenCalledWith(422);
	});
});

describe("validate (params)", () => {
	it("attaches parsed data to req.params", () => {
		const pSchema = z.object({ id: z.string().min(1) });
		const req = makeReq({ params: { id: "abc" } as any });
		const next = vi.fn();
		validate(pSchema, "params")(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
		expect((req as any).params.id).toBe("abc");
	});

	it("sends 422 for missing param", () => {
		const pSchema = z.object({ id: z.string().min(1) });
		const res = mockRes();
		validate(pSchema, "params")(makeReq({ params: {} as any }), res, vi.fn());
		expect(res.status).toHaveBeenCalledWith(422);
	});
});

describe("shorthand helpers", () => {
	it("validateBody delegates correctly", () => {
		const next = vi.fn();
		validateBody(schema)(
			makeReq({ body: { name: "Bob", age: 30 } }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith();
	});

	it("validateQuery delegates correctly", () => {
		const qSchema = z.object({ q: z.string() });
		const next = vi.fn();
		validateQuery(qSchema)(
			makeReq({ query: { q: "hi" } as any }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith();
	});

	it("validateParams delegates correctly", () => {
		const pSchema = z.object({ id: z.string() });
		const next = vi.fn();
		validateParams(pSchema)(
			makeReq({ params: { id: "1" } as any }),
			mockRes(),
			next,
		);
		expect(next).toHaveBeenCalledWith();
	});
});
