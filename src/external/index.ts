import { Router, Request, Response, NextFunction } from "express";
import { externalApiAuth } from "./middleware/auth.middleware";
import activityRoutes from "./routes/activity.route";
import leadRoutes from "./routes/lead.route";
import patientRoutes from "./routes/patient.route";
import statsRoutes from "./routes/stats.route";
import healthRoutes from "./routes/health.route";
import userRoutes from "./routes/user.route";
import settingRoutes from "./routes/setting.route";
import optionRoutes from "./routes/option.route";
import uploadRoutes from "./routes/upload.route";

const router = Router();

// Health check (no auth)
router.use("/", healthRoutes);

// Protected routes (auth handled in each route file)
router.use("/activity", activityRoutes);
router.use("/stats", externalApiAuth(["read:stats"]), statsRoutes);
router.use("/options", externalApiAuth(["read:options"]), optionRoutes);

router.use("/leads", (req: Request, res: Response, next: NextFunction) => {
    const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);
    const requiredPermission = isWriteMethod ? ["write:leads"] : ["read:leads"];
    return externalApiAuth(requiredPermission)(req, res, next);
}, leadRoutes);

router.use("/patients", (req: Request, res: Response, next: NextFunction) => {
    const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);
    const requiredPermission = isWriteMethod ? ["write:patients"] : ["read:patients"];
    return externalApiAuth(requiredPermission)(req, res, next);
}, patientRoutes);

router.use("/users", (req: Request, res: Response, next: NextFunction) => {
    const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);
    const requiredPermission = isWriteMethod ? ["write:users"] : ["read:users"];

    return externalApiAuth(requiredPermission)(req, res, next);
}, userRoutes);

router.use("/settings", (req: Request, res: Response, next: NextFunction) => {
    const isWriteMethod = ["POST", "PUT", "DELETE"].includes(req.method);
    const requiredPermission = isWriteMethod ? ["write:settings"] : ["read:settings"];
    return externalApiAuth(requiredPermission)(req, res, next);
}, settingRoutes);

router.use("/uploads", externalApiAuth(["write:uploads"]), uploadRoutes);

export default router;