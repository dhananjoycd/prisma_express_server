import cors from "cors";
import express, { Application } from "express";
import { env, parseOriginList } from "./lib/env";
import { errorHandler } from "./middlewares/errorHandler";
import { notFound } from "./middlewares/notFound";
import router from "./routes";

const app: Application = express();
const allowedOrigins = parseOriginList(env.APP_URL);

app.set("trust proxy", 1);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(
  "/api/v1/payments/stripe/webhook",
  express.raw({ type: "application/json" }),
);
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("FoodHub API running");
});

app.use("/api/v1", router);

app.use(notFound);
app.use(errorHandler);

export default app;
