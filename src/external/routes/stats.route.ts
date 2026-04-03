import { Router } from "express";
import {
    getOverview,
    getFinance,
    getInterests,
    getTrends,
    getByClinics,
} from "../controllers/stats.controller";

const router = Router();

/**
 * Stats Routes (External API)
 * Base: /api/external/v1/stats
 */

// GET /overview - Overall statistics
router.get("/overview", getOverview);

// GET /finance - Financial statistics
router.get("/finance", getFinance);

// GET /interests - Interest/procedure statistics
router.get("/interests", getInterests);

// GET /trends - Monthly trends
router.get("/trends", getTrends);

// GET /clinics - Statistics by clinic
router.get("/clinics", getByClinics);

export default router;