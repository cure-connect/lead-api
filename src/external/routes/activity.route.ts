import { Router } from "express";
import { externalApiAuth } from "../middleware/auth.middleware";
import {
  create,
  listActivities,
  getById,
  getByResource,
  getByUser,
  getStats,
} from "../controllers/activity.controller";

const router = Router();

/**
 * Activity Routes (External API)
 * Base: /api/external/v1/activity
 */

// POST / - Create activity (requires write permission)
router.post("/", externalApiAuth(["write:activity"]), create);

// GET endpoints (requires read permission)
router.get("/", externalApiAuth(["read:activity"]), listActivities);
router.get("/stats", externalApiAuth(["read:activity"]), getStats);
router.get("/resource/:resource/:resourceId", externalApiAuth(["read:activity"]), getByResource);
router.get("/user/:userId", externalApiAuth(["read:activity"]), getByUser);
router.get("/:id", externalApiAuth(["read:activity"]), getById);

export default router;