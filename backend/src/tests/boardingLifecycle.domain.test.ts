import { describe, expect, it } from "vitest";
import {
	BOARDING_TRANSITIONS,
	canTransition,
} from "@/domain/boardingLifecycle.js";
import { BoardingStatus, Role } from "@/types/enums.js";

describe("boarding lifecycle transition matrix", () => {
	it("defines transitions for every supported action", () => {
		expect(Object.keys(BOARDING_TRANSITIONS).length).toBeGreaterThan(0);
	});

	it("allows owner submit from DRAFT", () => {
		expect(canTransition("OWNER_SUBMIT", BoardingStatus.DRAFT, Role.OWNER)).toBe(
			true,
		);
	});

	it("forbids owner submit from ACTIVE", () => {
		expect(canTransition("OWNER_SUBMIT", BoardingStatus.ACTIVE, Role.OWNER)).toBe(
			false,
		);
	});

	it("allows admin approve only from PENDING_APPROVAL", () => {
		expect(
			canTransition("ADMIN_APPROVE", BoardingStatus.PENDING_APPROVAL, Role.ADMIN),
		).toBe(true);
		expect(
			canTransition("ADMIN_APPROVE", BoardingStatus.DRAFT, Role.ADMIN),
		).toBe(false);
	});

	it("forbids actor-role mismatch", () => {
		expect(
			canTransition("ADMIN_REJECT", BoardingStatus.PENDING_APPROVAL, Role.OWNER),
		).toBe(false);
		expect(
			canTransition("OWNER_DEACTIVATE", BoardingStatus.ACTIVE, Role.ADMIN),
		).toBe(false);
	});
});
