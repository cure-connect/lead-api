import { Router } from "express";
import {
    listPatients,
    search,
    checkTel,
    getById,
    create,
    update,
    getAppointments,
    getTransactions,
    addDepositController,
    useDepositController,
    refundDepositController,
    adjustBalanceController,
} from "../controllers/patient.controller";

const router = Router();

/**
 * Patient Routes (External API)
 * Base: /api/external/v1/patients
 *
 * Permissions handled in index.ts:
 * - read:patients  → GET endpoints
 * - write:patients → POST, PUT endpoints
 */

// === Search & Utility ===

// GET /search - Search patients (autocomplete) (?clinic_id=xxx&q=xxx)
router.get("/search", search);

// GET /check-tel - Check duplicate phone (?clinic_id=xxx&tel=xxx)
router.get("/check-tel", checkTel);

// === CRUD ===

// GET / - List patients (?clinic_id=xxx&search=xxx&has_balance=true)
router.get("/", listPatients);

// GET /:id - Get patient by ID (?clinic_id=xxx)
router.get("/:id", getById);

// POST / - Create patient
router.post("/", create);

// PUT /:id - Update patient
router.put("/:id", update);

// === Appointments ===

// GET /:id/appointments - Get patient's leads/appointments (?clinic_id=xxx)
router.get("/:id/appointments", getAppointments);

// === Wallet / Transactions ===

// GET /:id/transactions - Get transaction history (?clinic_id=xxx)
router.get("/:id/transactions", getTransactions);

// POST /:id/deposit - Add deposit
router.post("/:id/deposit", addDepositController);

// POST /:id/use-deposit - Use deposit
router.post("/:id/use-deposit", useDepositController);

// POST /:id/refund - Refund deposit
router.post("/:id/refund", refundDepositController);

// POST /:id/adjust - Adjust balance (admin)
router.post("/:id/adjust", adjustBalanceController);

export default router;