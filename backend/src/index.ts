import "dotenv/config";
import { createServer } from "node:http";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./lib/mongodb.js";
import { setupSocketIO } from "./lib/socket.js";

const PORT = config.port;


connectDB()
	.then(() => {
		const httpServer = createServer(app);
		setupSocketIO(httpServer);

		httpServer.listen(PORT, () => {
			console.info(
				`[Server] UniStay backend running on port http://localhost:${PORT} in ${config.nodeEnv} mode`,
			);
			console.info(`[Socket.io] Real-time chat enabled`);
		});
	})
	.catch((error) => {
		console.error("[Server] Failed to connect to the database:", error);
		process.exit(1);
	});
