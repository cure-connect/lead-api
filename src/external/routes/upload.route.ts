import { Router } from "express";
import {
    uploadSlip,
    uploadReceipt,
    uploadSlips,
    uploadReceipts,
} from "../controllers/upload.controller";
import {
    uploadSlip as slipMulter,
    uploadReceipt as receiptMulter,
    MAX_FILES,
} from "../../middleware/upload.middleware";

const router = Router();

/**
 * Upload Routes (External API)
 * Base: /api/external/v1/uploads
 *
 * Permission: write:uploads
 *
 * Reuses same multer middleware as internal API
 * Files saved to same /uploads/slips and /uploads/receipts directories
 *
 * Usage flow:
 * 1. Upload file(s) → get URL(s)
 * 2. Use URL(s) in lead create/update body
 *    - deposit.slipUrls: ["/uploads/slips/slip-xxx.jpg"]
 *    - receiptUrls: ["/uploads/receipts/receipt-xxx.jpg"]
 */

// Single file
router.post("/slip", slipMulter.single("slip"), uploadSlip);
router.post("/receipt", receiptMulter.single("receipt"), uploadReceipt);

// Multiple files (max 5)
router.post("/slips", slipMulter.array("slips", MAX_FILES), uploadSlips);
router.post("/receipts", receiptMulter.array("receipts", MAX_FILES), uploadReceipts);

export default router;