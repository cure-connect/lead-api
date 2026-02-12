import { Router } from "express";
import { uploadSlipController, uploadReceiptController } from "../controllers/upload.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";
import { uploadSlip, uploadReceipt } from "../middleware/upload.middleware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));
router.use(authMiddleware);

router.post("/upload/slip", uploadSlip.single("slip"), uploadSlipController);
router.post("/upload/receipt", uploadReceipt.single("receipt"), uploadReceiptController);

export default router;