import type { Request, Response } from "express";
import { vi } from "vitest";

export function makeObjectId(value = "507f1f77bcf86cd799439011") {
	return { toString: () => value };
}

export function queryResult<T>(value: T) {
	const chain: Record<string, unknown> = {};
	const pass = () => chain;

	for (const method of [
		"populate",
		"select",
		"skip",
		"limit",
		"sort",
		"lean",
		"where",
		"lt",
	]) {
		chain[method] = vi.fn(pass);
	}

	chain.then = (onFulfilled: (resolved: T) => unknown) =>
		Promise.resolve(value).then(onFulfilled);

	return chain;
}

export function makeReq(overrides: Partial<Request> = {}): Request {
	return {
		params: { id: "507f1f77bcf86cd799439011", roomId: "507f1f77bcf86cd799439011" },
		query: { page: 1, size: 10 },
		body: {
			otherUserId: "507f1f77bcf86cd799439012",
			adType: "SELL",
			price: 2000,
			title: "Desk",
			roomId: "507f1f77bcf86cd799439011",
			messageId: "507f1f77bcf86cd799439012",
			reason: "Spam",
		},
		user: {
			userId: "507f1f77bcf86cd799439011",
			role: "OWNER",
			email: "owner@example.com",
		},
		headers: { "user-agent": "vitest" },
		...overrides,
	} as unknown as Request;
}

export function makeRes(): Response {
	const json = vi.fn();
	const send = vi.fn();
	const redirect = vi.fn();
	const type = vi.fn(() => ({ set, send }));
	const set = vi.fn(() => ({ send }));
	const status = vi.fn(() => ({ json, type, set, send, redirect }));
	return { status, json, type, set, send, redirect } as unknown as Response;
}
