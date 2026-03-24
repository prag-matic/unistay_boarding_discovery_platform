import "dotenv/config";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./lib/mongodb.js";

const PORT = config.port;

connectDB()
	.then(() => {
		app.listen(PORT, () => {
			console.info(
				`[Server] UniStay backend running on port http://localhost:${PORT} in ${config.nodeEnv} mode`,
			);
		});
	})
	.catch((error) => {
		console.error("[Server] Failed to connect to the database:", error);
		process.exit(1);
	});
