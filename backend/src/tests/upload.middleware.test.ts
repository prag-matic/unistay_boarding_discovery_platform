import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import {
	MAX_BOARDING_IMAGES,
	validateReviewFiles,
} from "@/middleware/upload.js";

function mockRes() {
	const res: Partial<Response> = {};
	res.status = vi.fn().mockReturnValue(res);
	res.json = vi.fn().mockReturnValue(res);
	return res as Response;
}

function makeFile(
	mimetype: string,
	originalname = "file",
): Express.Multer.File {
	return {
		mimetype,
		originalname,
		buffer: Buffer.from(""),
		fieldname: "",
		encoding: "",
		size: 0,
		stream: null as any,
		destination: "",
		filename: "",
		path: "",
	};
}

describe("MAX_BOARDING_IMAGES", () => {
	it("is 8", () => expect(MAX_BOARDING_IMAGES).toBe(8));
});

describe("validateReviewFiles", () => {
	it("calls next() when no files attached", () => {
		const req = { files: {} } as unknown as Request;
		const next = vi.fn();
		validateReviewFiles(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
	});

	it("calls next() for valid image mimetypes", () => {
		const req = {
			files: {
				images: [
					makeFile("image/jpeg", "a.jpg"),
					makeFile("image/png", "b.png"),
				],
			},
		} as unknown as Request;
		const next = vi.fn();
		validateReviewFiles(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
	});

	it("returns 400 for an invalid image mimetype", () => {
		const req = {
			files: { images: [makeFile("image/bmp", "bad.bmp")] },
		} as unknown as Request;
		const res = mockRes();
		const next = vi.fn();
		validateReviewFiles(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect(next).not.toHaveBeenCalled();
		const body = (res.json as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(body.error).toBe("UploadError");
		expect(body.message).toContain("bad.bmp");
	});

	it("calls next() for valid video mimetypes", () => {
		for (const mime of ["video/mp4", "video/webm", "video/quicktime"]) {
			const req = {
				files: { video: [makeFile(mime, "vid.mp4")] },
			} as unknown as Request;
			const next = vi.fn();
			validateReviewFiles(req, mockRes(), next);
			expect(next).toHaveBeenCalledWith();
		}
	});

	it("calls next() for application/octet-stream with a recognised video extension", () => {
		const req = {
			files: { video: [makeFile("application/octet-stream", "clip.mp4")] },
		} as unknown as Request;
		const next = vi.fn();
		validateReviewFiles(req, mockRes(), next);
		expect(next).toHaveBeenCalledWith();
	});

	it("returns 400 for application/octet-stream with a non-video extension", () => {
		const req = {
			files: { video: [makeFile("application/octet-stream", "clip.exe")] },
		} as unknown as Request;
		const res = mockRes();
		const next = vi.fn();
		validateReviewFiles(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
	});

	it("returns 400 for an invalid video mimetype", () => {
		const req = {
			files: { video: [makeFile("video/avi", "bad.avi")] },
		} as unknown as Request;
		const res = mockRes();
		const next = vi.fn();
		validateReviewFiles(req, res, next);
		expect(res.status).toHaveBeenCalledWith(400);
		expect((res.json as ReturnType<typeof vi.fn>).mock.calls[0][0].error).toBe(
			"UploadError",
		);
	});
});
