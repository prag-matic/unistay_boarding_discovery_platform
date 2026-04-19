import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createChatRoom,
	getChatHistory,
	getChatRoom,
	getChatRooms,
} from "@/controllers/chat.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { ChatRoom } from "@/models/ChatRoom.js";
import { User } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("chat.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("getChatRooms requires authentication", async () => {
		const next = vi.fn();
		await getChatRooms(makeReq({ user: undefined }), makeRes(), next as NextFunction);
		expect(next).toHaveBeenCalledOnce();
	});

	it("getChatRoom rejects invalid room id", async () => {
		const next = vi.fn();
		await getChatRoom(
			makeReq({
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
				params: { roomId: "bad-id" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);
		expect(next).toHaveBeenCalledOnce();
	});

	it("createChatRoom rejects same-role chat", async () => {
		vi.mocked(User.findById).mockReturnValueOnce(
			queryResult({ _id: makeObjectId("507f1f77bcf86cd799439012"), role: "STUDENT" }) as never,
		);
		const next = vi.fn();

		await createChatRoom(
			makeReq({
				user: { userId: "507f1f77bcf86cd799439011", role: "STUDENT" } as never,
				body: { otherUserId: "507f1f77bcf86cd799439012" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createChatRoom returns existing room when found", async () => {
		vi.mocked(User.findById).mockReturnValueOnce(
			queryResult({ _id: makeObjectId("507f1f77bcf86cd799439012"), role: "STUDENT" }) as never,
		);
		vi.mocked(ChatRoom.findOne).mockReturnValueOnce(
			queryResult({ _id: makeObjectId("507f1f77bcf86cd799439091") }) as never,
		);
		vi.mocked(ChatRoom.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439091"),
				participants: {
					student: { _id: makeObjectId("507f1f77bcf86cd799439012") },
					owner: { _id: makeObjectId("507f1f77bcf86cd799439011") },
				},
			}) as never,
		);

		await createChatRoom(
			makeReq({
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
				body: { otherUserId: "507f1f77bcf86cd799439012" } as never,
			}),
			makeRes(),
			vi.fn() as NextFunction,
		);

		expect(sendSuccess).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ id: "507f1f77bcf86cd799439091" }),
			"Chat room retrieved successfully",
		);
	});

	it("getChatHistory rejects non-participant user", async () => {
		vi.mocked(ChatRoom.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439111"),
				participants: {
					student: makeObjectId("507f1f77bcf86cd799439012"),
					owner: makeObjectId("507f1f77bcf86cd799439013"),
				},
			}) as never,
		);

		const next = vi.fn();
		await getChatHistory(
			makeReq({
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
				params: { roomId: "507f1f77bcf86cd799439111" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});
});
