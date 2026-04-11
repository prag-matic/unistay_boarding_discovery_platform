import { describe, expect, it } from "vitest";
import { generateSecureToken, sha256 } from "@/lib/hash.js";

describe("sha256", () => {
	it("returns a 64-char hex string", () => {
		expect(sha256("hello")).toHaveLength(64);
		expect(sha256("hello")).toMatch(/^[0-9a-f]+$/);
	});
	it("is deterministic", () => expect(sha256("x")).toBe(sha256("x")));
	it("different inputs give different hashes", () =>
		expect(sha256("a")).not.toBe(sha256("b")));
	it("handles empty string", () => expect(sha256("")).toHaveLength(64));
});

describe("generateSecureToken", () => {
	it("default is 64-char hex (32 bytes)", () => {
		expect(generateSecureToken()).toHaveLength(64);
		expect(generateSecureToken()).toMatch(/^[0-9a-f]+$/);
	});
	it("custom byte count", () =>
		expect(generateSecureToken(48)).toHaveLength(96));
	it("generates unique tokens", () =>
		expect(generateSecureToken()).not.toBe(generateSecureToken()));
});
