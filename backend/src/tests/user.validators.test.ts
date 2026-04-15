import { describe, expect, it } from "vitest";
import {
	adminListUsersQuerySchema,
	changePasswordSchema,
	updateProfileSchema,
} from "@/schemas/user.validators.js";

describe("updateProfileSchema", () => {
	it("accepts empty object (all fields optional)", () =>
		expect(() => updateProfileSchema.parse({})).not.toThrow());

	it("accepts all fields", () => {
		const r = updateProfileSchema.parse({
			firstName: "John",
			lastName: "Doe",
			phone: "+94771234567",
			university: "UOM",
			nicNumber: "991234567V",
		});
		expect(r.firstName).toBe("John");
		expect(r.nicNumber).toBe("991234567V");
	});

	it("rejects empty firstName", () =>
		expect(() => updateProfileSchema.parse({ firstName: "" })).toThrow());

	it("rejects empty lastName", () =>
		expect(() => updateProfileSchema.parse({ lastName: "" })).toThrow());

	it("rejects firstName over 100 chars", () =>
		expect(() =>
			updateProfileSchema.parse({ firstName: "a".repeat(101) }),
		).toThrow());

	it("rejects lastName over 100 chars", () =>
		expect(() =>
			updateProfileSchema.parse({ lastName: "a".repeat(101) }),
		).toThrow());
});

describe("changePasswordSchema", () => {
	const valid = { currentPassword: "OldPass1", newPassword: "NewPass1" };

	it("accepts valid data", () =>
		expect(() => changePasswordSchema.parse(valid)).not.toThrow());

	it("rejects empty currentPassword", () =>
		expect(() =>
			changePasswordSchema.parse({ ...valid, currentPassword: "" }),
		).toThrow());

	it("rejects newPassword < 8 chars", () =>
		expect(() =>
			changePasswordSchema.parse({ ...valid, newPassword: "Short1" }),
		).toThrow());

	it("rejects newPassword without uppercase", () =>
		expect(() =>
			changePasswordSchema.parse({ ...valid, newPassword: "password1" }),
		).toThrow());

	it("rejects newPassword without number", () =>
		expect(() =>
			changePasswordSchema.parse({ ...valid, newPassword: "Password" }),
		).toThrow());
});

describe("adminListUsersQuerySchema", () => {
	it("uses defaults for empty input", () => {
		const r = adminListUsersQuerySchema.parse({});
		expect(r.page).toBe(1);
		expect(r.size).toBe(20);
	});

	it("coerces page/size from strings", () => {
		const r = adminListUsersQuerySchema.parse({ page: "3", size: "50" });
		expect(r.page).toBe(3);
		expect(r.size).toBe(50);
	});

	it("rejects size > 100", () =>
		expect(() => adminListUsersQuerySchema.parse({ size: "200" })).toThrow());

	it("accepts valid role filter", () => {
		const r = adminListUsersQuerySchema.parse({ role: "OWNER" });
		expect(r.role).toBe("OWNER");
	});

	it("rejects invalid role", () =>
		expect(() =>
			adminListUsersQuerySchema.parse({ role: "SUPERUSER" }),
		).toThrow());

	it("parses active=true as boolean true", () => {
		const r = adminListUsersQuerySchema.parse({ active: "true" });
		expect(r.active).toBe(true);
	});

	it("parses active=false as boolean false", () => {
		const r = adminListUsersQuerySchema.parse({ active: "false" });
		expect(r.active).toBe(false);
	});

	it("accepts search query and trims spaces", () => {
		const r = adminListUsersQuerySchema.parse({ search: "  john doe  " });
		expect(r.search).toBe("john doe");
	});

	it("rejects search longer than 100 chars", () =>
		expect(() =>
			adminListUsersQuerySchema.parse({ search: "a".repeat(101) }),
		).toThrow());
});
