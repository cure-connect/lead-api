import express from "express";
import cors from "cors";
import { connectDB } from "./db/db";
import dotenv from "dotenv";
dotenv.config();
import leadroute from "./routes/lead.route"
import settingroute from "./routes/setting.route"

const app = express();

app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/lead/v1/api", leadroute)
app.use("/lead/v1/api", settingroute)

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();


export default app;
