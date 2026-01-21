import { Router } from "express";
import {
  createLeadController,
  getLeadsController,
  getLeadByIdController,
  updateLeadController,
  deleteLeadController,
} from "../controllers/lead.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));
router.use(authMiddleware);

router.post("/createlead", createLeadController);
router.get("/lead", getLeadsController);
router.get("/:id", getLeadByIdController);
router.patch("/:id", updateLeadController);
router.delete("/:id", deleteLeadController);

export default router;
