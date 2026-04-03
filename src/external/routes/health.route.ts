import { Router, Request, Response } from "express";

const router = Router();

/**
 * GET /health
 * Health check endpoint (no auth required)
 */
router.get("/health", (req: Request, res: Response) => {
    res.json({
        success: true,
        data: {
            status: "healthy",
            timestamp: new Date().toISOString(),
            version: process.env.API_VERSION || "1.0.0",
        },
    });
});

export default router;