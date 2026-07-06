import "./env.js";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import { connectDB, getMongoConnectionStatus } from "./db.js";
import { router } from "./routes/index.js";

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error." });
};

app.use(cors());
app.use(express.json());
app.use("/api", router);
app.use(errorHandler);

async function startServer() {
  try {
    await connectDB();
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
