import type { Request, Response } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";

const router = Router();

/**
 * Generous per-IP rate limit for tile requests.
 * A single map interaction can load dozens of tiles; 1 000 req/min is well
 * within what a normal user would trigger while browsing the app.
 */
const tileLimiter = rateLimit({
	windowMs: 60 * 1000,
	max: 1000,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		error: "TooManyRequests",
		message: "Too many tile requests. Please try again later.",
	},
});

/**
 * User-Agent sent to the OSM tile servers.
 *
 * The OpenStreetMap Tile Usage Policy requires every client to identify itself
 * via a valid User-Agent header:
 * https://operations.osmfoundation.org/policies/tiles/
 *
 * react-native-maps / UrlTile cannot set custom HTTP headers, so all tile
 * requests are routed through this proxy which attaches the header on behalf
 * of the mobile client.
 */
const OSM_USER_AGENT =
	"UniStay/2.4.0 (react-native-maps tile proxy; https://github.com/prag-matic/unistay_boarding_discovery_platform)";

/**
 * GET /tiles/:z/:x/:y
 *
 * Proxies a single OpenStreetMap raster tile to the mobile client while
 * attaching the required User-Agent and forwarding OSM's Cache-Control header
 * so the native map layer can cache tiles normally.
 */
router.get("/:z/:x/:y", tileLimiter, async (req: Request, res: Response) => {
	const { z, x, y } = req.params as Record<string, string>;

	// Reject non-numeric coordinates to prevent path-traversal / SSRF.
	if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
		res
			.status(400)
			.json({ success: false, error: "BadRequest", message: "Invalid tile coordinates" });
		return;
	}

	const zoom = parseInt(z, 10);
	if (zoom < 0 || zoom > 19) {
		res.status(400).json({
			success: false,
			error: "BadRequest",
			message: "Zoom level must be between 0 and 19",
		});
		return;
	}

	try {
		const upstream = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
			headers: {
				"User-Agent": OSM_USER_AGENT,
				Accept: "image/png",
			},
		});

		if (!upstream.ok) {
			res.status(upstream.status).end();
			return;
		}

		res.setHeader("Content-Type", upstream.headers.get("Content-Type") ?? "image/png");
		res.setHeader(
			"Cache-Control",
			upstream.headers.get("Cache-Control") ?? "public, max-age=86400",
		);

		const buffer = await upstream.arrayBuffer();
		res.send(Buffer.from(buffer));
	} catch {
		res
			.status(502)
			.json({ success: false, error: "BadGateway", message: "Failed to fetch tile from upstream" });
	}
});

export default router;
