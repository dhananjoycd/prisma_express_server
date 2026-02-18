import cors from "cors";
import express, { Application } from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import router from "./routes";

const app: Application = express();

app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000",
    credentials: true,
  }),
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("FoodHub API running");
});

app.use("/api/v1", router);

app.use(notFound);
app.use(errorHandler);

export default app;
