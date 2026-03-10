import express from "express";
import cors from "cors";
import path from "path";
import { connectDB } from "./db/db";
import dotenv from "dotenv";
dotenv.config();
import leadroute from "./routes/lead.route"
import settingroute from "./routes/setting.route"
import userroute from "./routes/user.route"
import authroute from "./routes/auth.route"
import uploadroute from "./routes/upload.route"
import patientroute from "./routes/patient.route";
// import externalApiRoutes from "./external";
// import apiKeyRoutes from "./routes/api-key.route";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger";

const app = express();

const allowedOrigins =
  process.env.CORS_ORIGIN?.split(",").map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use("/lead/v1/api/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// app.use("/lead/external/v1/api", externalApiRoutes);

// app.use("/lead/v1/api-keys", apiKeyRoutes);

app.use("/lead/v1/auth", authroute)
app.use("/lead/v1/api", patientroute)
app.use("/lead/v1/api", leadroute)
app.use("/lead/v1/api", settingroute)
app.use("/lead/v1/api", userroute)
app.use("/lead/v1/api", uploadroute)

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();


export default app;