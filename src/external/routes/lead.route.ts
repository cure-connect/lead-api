import { Router } from "express";
import {
  listLeads,
  getById,
  getByPhone,
  getByClinic,
  getHistory,
  create,
  update,
  remove,
} from "../controllers/lead.controller";

const router = Router();

/**
 * Lead Routes (External API)
 * Base: /api/external/v1/leads
 * 
 * Permissions handled in index.ts:
 * - read:leads  → GET endpoints
 * - write:leads → POST, PUT, DELETE endpoints
 */

// GET / - List with filters
router.get("/", listLeads);

// GET /patient/:phone - By patient phone
router.get("/patient/:phone", getByPhone);

// GET /clinic/:clinicId - By clinic
router.get("/clinic/:clinicId", getByClinic);

// GET /history/:id - Appointment history chain
router.get("/history/:id", getHistory);

// GET /:id - Single lead
router.get("/:id", getById);

// POST / - Create lead
router.post("/", create);

// PUT /:id - Update lead (requires ?clinic_id=xxx)
router.put("/:id", update);

// DELETE /:id - Delete lead (requires ?clinic_id=xxx)
router.delete("/:id", remove);

export default router;