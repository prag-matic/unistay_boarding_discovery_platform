import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/errors/AppError.js";
import { buildSlug } from "@/utils/slug.js";

describe("buildSlug", () => {
	it("converts title to kebab-case with 6-char suffix", () => {
		expect(buildSlug("My Boarding House")).toMatch(
			/^my-boarding-house-[a-z0-9]{6}$/,
		);
	});

	it("strips special characters", () => {
		expect(buildSlug("Hello! @ World#")).toMatch(/^hello-world-[a-z0-9]{6}$/);
	});

	it("collapses multiple spaces/hyphens", () => {
		expect(buildSlug("foo   ---   bar")).toMatch(/^foo-bar-[a-z0-9]{6}$/);
	});

	it("produces different slugs for same input (random suffix)", () => {
		expect(buildSlug("Same Title")).not.toBe(buildSlug("Same Title"));
	});
});

describe("generateUniqueSlug", () => {
	beforeEach(() => vi.resetModules());

	it("returns a slug when no collision found", async () => {
		vi.doMock("@/lib/prisma.js", () => ({
			default: { boarding: { findUnique: vi.fn().mockResolvedValue(null) } },
		}));
		const { generateUniqueSlug } = await import("@/utils/slug.js");
		const slug = await generateUniqueSlug("Nice Place");
		expect(slug).toMatch(/^nice-place-[a-z0-9]{6}$/);
	});

	it("retries on collision and returns a valid slug", async () => {
		let calls = 0;
		vi.doMock("@/lib/prisma.js", () => ({
			default: {
				boarding: {
					findUnique: vi.fn().mockImplementation(() => {
						calls++;
						return calls === 1
							? Promise.resolve({ id: "other", slug: "taken" })
							: Promise.resolve(null);
					}),
				},
			},
		}));
		const { generateUniqueSlug } = await import("@/utils/slug.js");
		const slug = await generateUniqueSlug("Taken Title");
		expect(slug).toBeTruthy();
		expect(calls).toBe(2);
	});

	it("skips collision when the existing record has the excluded ID", async () => {
		vi.doMock("@/lib/prisma.js", () => ({
			default: {
				boarding: {
					findUnique: vi.fn().mockResolvedValue({ id: "my-id", slug: "s" }),
				},
			},
		}));
		const { generateUniqueSlug } = await import("@/utils/slug.js");
		const slug = await generateUniqueSlug("My Title", "my-id");
		expect(slug).toBeTruthy();
	});

	it("throws AppError after max attempts", async () => {
		vi.doMock("@/lib/prisma.js", () => ({
			default: {
				boarding: {
					findUnique: vi.fn().mockResolvedValue({ id: "other", slug: "taken" }),
				},
			},
		}));
		const { generateUniqueSlug } = await import("@/utils/slug.js");
		await expect(generateUniqueSlug("Always Taken")).rejects.toThrow(
			"Could not generate a unique slug",
		);
	});
});
