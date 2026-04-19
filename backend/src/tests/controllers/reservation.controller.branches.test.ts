import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	approveReservation,
	createReservation,
	getReservationById,
} from "@/controllers/reservation.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { Boarding, Reservation } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("reservation.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createReservation requires authentication", async () => {
		const next = vi.fn();

		await createReservation(makeReq({ user: undefined as never }), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createReservation rejects too-soon move-in date", async () => {
		const next = vi.fn();

		await createReservation(
			makeReq({
				body: {
					boardingId: "507f1f77bcf86cd799439090",
					moveInDate: new Date().toISOString(),
				} as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createReservation rejects when active reservation exists", async () => {
		vi.mocked(Boarding.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439090"),
				isDeleted: false,
				status: "ACTIVE",
				currentOccupants: 1,
				maxOccupants: 3,
			} as Record<string, unknown>) as never,
		);
		vi.mocked(Reservation.findOne).mockResolvedValueOnce(
			{ _id: makeObjectId("507f1f77bcf86cd799439951"), status: "ACTIVE" } as never,
		);

		const next = vi.fn();
		const tomorrow = new Date();
		tomorrow.setDate(tomorrow.getDate() + 2);

		await createReservation(
			makeReq({
				body: {
					boardingId: "507f1f77bcf86cd799439090",
					moveInDate: tomorrow.toISOString(),
				} as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getReservationById denies unrelated owner", async () => {
		vi.mocked(Reservation.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439952"),
				studentId: { _id: makeObjectId("507f1f77bcf86cd799439012") },
				boardingId: { _id: makeObjectId("507f1f77bcf86cd799439090") },
			} as Record<string, unknown>) as never,
		);
		vi.mocked(Boarding.findById).mockResolvedValueOnce(
			{ _id: makeObjectId("507f1f77bcf86cd799439090"), ownerId: makeObjectId("507f1f77bcf86cd799439099") } as never,
		);

		const next = vi.fn();
		await getReservationById(
			makeReq({
				params: { id: "507f1f77bcf86cd799439952" } as never,
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("approveReservation rejects non-pending status", async () => {
		vi.mocked(Reservation.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439953"),
				status: "ACTIVE",
				expiresAt: new Date(Date.now() + 60_000),
				moveInDate: new Date(),
				rentSnapshot: 30000,
				boardingId: {
					_id: "507f1f77bcf86cd799439090",
					ownerId: makeObjectId("507f1f77bcf86cd799439011"),
					currentOccupants: 1,
					maxOccupants: 3,
				},
			} as Record<string, unknown>) as never,
		);

		const next = vi.fn();
		await approveReservation(
			makeReq({ params: { id: "507f1f77bcf86cd799439953" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getMyRequests sends reservations for authenticated student", async () => {
		vi.mocked(Reservation.find).mockReturnValueOnce(
			queryResult([
				{
					_id: makeObjectId("507f1f77bcf86cd799439501"),
					studentId: makeObjectId("507f1f77bcf86cd799439011"),
					boardingId: makeObjectId("507f1f77bcf86cd799439090"),
				} as Record<string, unknown>,
			]) as never,
		);

		const { getMyRequests } = await import("@/controllers/reservation.controller.js");
		await getMyRequests(makeReq(), makeRes(), vi.fn() as NextFunction);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ reservations: expect.any(Array) }),
		);
	});
});
