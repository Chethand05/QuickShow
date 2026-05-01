import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './configs/db.js';
import { clerkMiddleware } from '@clerk/express';
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import { stripeWebhooks } from './controllers/stripeWebhooks.js';

// ✅ Load env FIRST
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// ✅ Start server ONLY after DB connects
const startServer = async () => {
  try {
    console.log("👉 MONGO_URI exists:", !!process.env.MONGO_URI);

    await connectDB(); // wait for DB

    // Stripe Webhooks Route
    app.use('/api/stripe', express.raw({ type: 'application/json' }), stripeWebhooks);

    // Middleware
    app.use(express.json());
    app.use(cors());
    app.use(clerkMiddleware());

    // Routes
    app.get('/', (req, res) => res.send('Server is Live!'));
    app.use('/api/inngest', serve({ client: inngest, functions }));
    app.use('/api/show', showRouter);
    app.use('/api/booking', bookingRouter);
    app.use('/api/admin', adminRouter);
    app.use('/api/user', userRouter);

    // Start server
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server:", error);
  }
};

startServer();