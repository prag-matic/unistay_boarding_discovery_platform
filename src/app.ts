import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
// import router from './routes';
// import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
// app.use(router);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: 'The requested resource was not found',
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
// app.use(errorHandler);

export default app;
