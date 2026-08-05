import "./env.js";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { connectDB, getMongoConnectionStatus } from "./db.js";
import {
  generalApiRateLimiter,
  hitPayWebhookRateLimiter,
} from "./middleware/rateLimits.js";
import { hitPayWebhookRouter } from "./routes/payments.js";
import { router } from "./routes/index.js";
import { getVidaCommissionRate } from "./services/payments/commission.js";
import { startPaymentMaintenance } from "./services/payments/paymentService.js";

const app = express();
app.set("trust proxy", 1);
const port = process.env.PORT ? Number(process.env.PORT) : 4000;

getVidaCommissionRate();

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error." });
};

app.use(cors());
app.use("/api", generalApiRateLimiter);
app.use(
  "/api/payments/webhook/hitpay",
  hitPayWebhookRateLimiter,
  express.raw({ type: "application/json", limit: "256kb" }),
  hitPayWebhookRouter,
);
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

async function startServer() {
  try {
    const connected = await connectDB();

    if (connected) {
      startPaymentMaintenance();
    }
  } catch (error) {
    console.error("Failed to connect to MongoDB; API routes will return 503.", error);
  }

  app.listen(port, () => {
    const mongo = getMongoConnectionStatus();

    console.log(
      `vida backend running on http://localhost:${port} (MongoDB: ${mongo.state})`,
    );
  });
}

startServer();
