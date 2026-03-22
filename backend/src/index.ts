import "dotenv/config";
import app from "./app.js";
import { config } from "./config/env.js";
import { connectDB } from "./lib/mongodb.js";

const PORT = config.port;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(
      `[Server] UniStay backend running on port http://localhost:${PORT} in ${config.nodeEnv} mode`,
    );
  });
});
