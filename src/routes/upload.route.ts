import { Router } from "express";
import {
    uploadSlipController,
    uploadReceiptController,
    uploadSlipsController,
    uploadReceiptsController
} from "../controllers/upload.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";
import { uploadSlip, uploadReceipt, MAX_FILES } from "../middleware/upload.middleware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));
router.use(authMiddleware);

// Single file upload
router.post("/upload/slip", uploadSlip.single("slip"), uploadSlipController);
router.post("/upload/receipt", uploadReceipt.single("receipt"), uploadReceiptController);

// Multiple files upload
router.post("/upload/slips", uploadSlip.array("slips", MAX_FILES), uploadSlipsController);
router.post("/upload/receipts", uploadReceipt.array("receipts", MAX_FILES), uploadReceiptsController);

export default router;