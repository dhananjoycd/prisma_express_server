import express, { Application } from "express";
import cors from "cors";

const app: Application = express();

app.use(
  cors({
    origin: process.env.APP_URL || "http://localhost:3000", // client side url
    credentials: true,
  }),
);

app.use(express.json());

/* app.all("/api/auth/*splat", toNodeHandler(auth)); */
/* 
app.use("/posts", postRouter);
app.use("/comments", commentRouter);
 */
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
/* app.use(notFound);
app.use(errorHandler); */

export default app;
