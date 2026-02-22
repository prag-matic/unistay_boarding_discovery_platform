import 'dotenv/config';
import app from './app.js';
import { config } from './config/env.js';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`[Server] UniStay backend running on port http://localhost:${PORT} in ${config.nodeEnv} mode`);
});