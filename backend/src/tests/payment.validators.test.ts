import { describe, expect, it } from "vitest";
import {
	logPaymentSchema,
	rejectPaymentSchema,
} from "@/schemas/payment.validators.js";

const validLog = {
	rentalPeriodId: "rp-1",
	reservationId: "res-1",
	amount: 15000,
	paymentMethod: "CASH" as const,
	paidAt: "2025-04-01T09:00:00",
};

describe("logPaymentSchema", () => {
	it("accepts valid data", () =>
		expect(() => logPaymentSchema.parse(validLog)).not.toThrow());

	it("accepts paidAt with timezone offset", () =>
		expect(() =>
			logPaymentSchema.parse({
				...validLog,
				paidAt: "2025-04-01T09:00:00+05:30",
			}),
		).not.toThrow());

	it("rejects empty rentalPeriodId", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, rentalPeriodId: "" }),
		).toThrow());

	it("rejects empty reservationId", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, reservationId: "" }),
		).toThrow());

	it("rejects zero amount", () =>
		expect(() => logPaymentSchema.parse({ ...validLog, amount: 0 })).toThrow());

	it("rejects negative amount", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, amount: -100 }),
		).toThrow());

	it("rejects invalid paymentMethod", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, paymentMethod: "CRYPTO" }),
		).toThrow());

	it("accepts BANK_TRANSFER paymentMethod", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, paymentMethod: "BANK_TRANSFER" }),
		).not.toThrow());

	it("accepts ONLINE paymentMethod", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, paymentMethod: "ONLINE" }),
		).not.toThrow());

	it("accepts optional referenceNumber", () => {
		const r = logPaymentSchema.parse({
			...validLog,
			referenceNumber: "REF123",
		});
		expect(r.referenceNumber).toBe("REF123");
	});

	it("rejects referenceNumber over 100 chars", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, referenceNumber: "x".repeat(101) }),
		).toThrow());

	it("accepts optional proofImageUrl", () => {
		const r = logPaymentSchema.parse({
			...validLog,
			proofImageUrl: "https://cdn.example.com/proof.jpg",
		});
		expect(r.proofImageUrl).toBe("https://cdn.example.com/proof.jpg");
	});

	it("rejects invalid proofImageUrl", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, proofImageUrl: "not-a-url" }),
		).toThrow());

	it("rejects malformed paidAt", () =>
		expect(() =>
			logPaymentSchema.parse({ ...validLog, paidAt: "01/04/2025" }),
		).toThrow());
});

describe("rejectPaymentSchema", () => {
	it("accepts non-empty reason", () =>
		expect(() =>
			rejectPaymentSchema.parse({ reason: "Insufficient amount" }),
		).not.toThrow());

	it("rejects empty reason", () =>
		expect(() => rejectPaymentSchema.parse({ reason: "" })).toThrow());

	it("rejects missing reason", () =>
		expect(() => rejectPaymentSchema.parse({})).toThrow());
});
