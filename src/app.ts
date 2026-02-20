import cors from "cors";
import express, { Application } from "express";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import router from "./routes";

const app: Application = express();

function sanitizeOrigin(value: string | undefined, fallback: string) {
  const firstChunk = (value ?? fallback).split(",")[0] ?? fallback;
  const firstLine = firstChunk.split(/\r?\n/)[0] ?? fallback;
  const clean = firstLine.trim();
  return clean || fallback;
}

const appUrl = sanitizeOrigin(process.env.APP_URL, "http://localhost:3000");

app.use(
  cors({
    origin: appUrl,
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

