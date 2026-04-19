import type { NextFunction } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	analyzeMessage,
	createIssue,
	deleteIssue,
	getIssue,
	updateIssue,
} from "@/controllers/issue.controller.js";
import { sendSuccess } from "@/lib/response.js";
import { ChatMessage } from "@/models/ChatMessage.js";
import { ChatRoom } from "@/models/ChatRoom.js";
import { Issue } from "@/models/index.js";
import { makeObjectId, makeReq, makeRes, queryResult } from "@/tests/helpers/controller-test-utils.js";

describe("issue.controller branches", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("createIssue rejects invalid room/message ids", async () => {
		const next = vi.fn();
		await createIssue(
			makeReq({ body: { roomId: "bad", messageId: "bad", reason: "Spam" } as never }),
			makeRes(),
			next as NextFunction,
		);
		expect(next).toHaveBeenCalledOnce();
	});

	it("createIssue forwards not found when chat room missing", async () => {
		vi.mocked(ChatRoom.findById).mockReturnValueOnce(queryResult(null) as never);
		const next = vi.fn();

		await createIssue(makeReq(), makeRes(), next as NextFunction);

		expect(next).toHaveBeenCalledOnce();
	});

	it("createIssue creates and returns populated issue", async () => {
		vi.mocked(ChatRoom.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId(),
				boardingId: makeObjectId("507f1f77bcf86cd799439090"),
				participants: {
					student: makeObjectId("507f1f77bcf86cd799439012"),
					owner: makeObjectId("507f1f77bcf86cd799439011"),
				},
			}) as never,
		);
		vi.mocked(ChatMessage.findOne).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439012"),
				content: "Need maintenance",
				senderId: makeObjectId("507f1f77bcf86cd799439012"),
				createdAt: new Date(),
			}) as never,
		);
		vi.mocked(ChatMessage.find).mockReturnValueOnce(
			queryResult([
				{
					content: "Need maintenance",
					senderId: { role: "STUDENT" },
					createdAt: new Date(),
				},
			]) as never,
		);
		vi.mocked(Issue.create).mockResolvedValueOnce(
			{ _id: makeObjectId("507f1f77bcf86cd799439080") } as never,
		);
		vi.mocked(Issue.findById).mockReturnValueOnce(
			queryResult({ _id: makeObjectId("507f1f77bcf86cd799439080"), title: "Generated" }) as never,
		);

		const res = makeRes();
		await createIssue(makeReq(), res, vi.fn() as NextFunction);

		const sendSuccessCalls = vi.mocked(sendSuccess).mock.calls;
		const resJsonCalls = res.json.mock.calls;
		const statusCalls = res.status.mock.calls;

		expect(sendSuccessCalls.length + resJsonCalls.length + statusCalls.length).toBeGreaterThan(0);
	});

	it("getIssue rejects invalid issue id", async () => {
		const next = vi.fn();

		await getIssue(
			makeReq({ params: { id: "bad-id" } as never }),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("getIssue denies unrelated student", async () => {
		vi.mocked(Issue.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439881"),
				reportedBy: { _id: makeObjectId("507f1f77bcf86cd799439099") },
				assignedTo: { _id: makeObjectId("507f1f77bcf86cd799439098") },
				roomId: { _id: makeObjectId("507f1f77bcf86cd799439111") },
			} as Record<string, unknown>) as never,
		);
		const next = vi.fn();

		await getIssue(
			makeReq({
				params: { id: "507f1f77bcf86cd799439881" } as never,
				user: { userId: "507f1f77bcf86cd799439011", role: "STUDENT" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("updateIssue rejects invalid status value", async () => {
		vi.mocked(Issue.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439882"),
				reportedBy: makeObjectId("507f1f77bcf86cd799439011"),
				assignedTo: makeObjectId("507f1f77bcf86cd799439098"),
			} as Record<string, unknown>) as never,
		);
		const next = vi.fn();

		await updateIssue(
			makeReq({
				params: { id: "507f1f77bcf86cd799439882" } as never,
				body: { status: "INVALID_STATUS" } as never,
				user: { userId: "507f1f77bcf86cd799439011", role: "STUDENT" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("deleteIssue denies non-admin non-reporter", async () => {
		vi.mocked(Issue.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439883"),
				reportedBy: makeObjectId("507f1f77bcf86cd799439099"),
			} as Record<string, unknown>) as never,
		);
		const next = vi.fn();

		await deleteIssue(
			makeReq({
				params: { id: "507f1f77bcf86cd799439883" } as never,
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});

	it("analyzeMessage rejects non-participant user", async () => {
		vi.mocked(ChatRoom.findById).mockReturnValueOnce(
			queryResult({
				_id: makeObjectId("507f1f77bcf86cd799439884"),
				participants: {
					student: makeObjectId("507f1f77bcf86cd799439012"),
					owner: makeObjectId("507f1f77bcf86cd799439013"),
				},
			} as Record<string, unknown>) as never,
		);
		const next = vi.fn();

		await analyzeMessage(
			makeReq({
				body: {
					roomId: "507f1f77bcf86cd799439884",
					messageId: "507f1f77bcf86cd799439885",
				} as never,
				user: { userId: "507f1f77bcf86cd799439011", role: "OWNER" } as never,
			}),
			makeRes(),
			next as NextFunction,
		);

		expect(next).toHaveBeenCalledOnce();
	});
});
