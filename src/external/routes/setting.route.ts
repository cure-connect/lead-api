import { Router } from "express";
import {
    listSettings,
    getTypes,
    getById,
    getByClinicAndType,
    create,
    createBulk,
    update,
    remove,
} from "../controllers/setting.controller";

const router = Router();

/**
 * Setting Routes (External API)
 * Base: /api/external/v1/settings
 * 
 * Permissions handled in index.ts:
 * - read:settings  → GET endpoints
 * - write:settings → POST, PUT, DELETE endpoints
 */

// GET /types - Get available setting types
router.get("/types", getTypes);

// GET / - List settings (?clinic_id=xxx&type=interest)
router.get("/", listSettings);

// GET /clinic/:clinicId/:type - By clinic and type
router.get("/clinic/:clinicId/:type", getByClinicAndType);

// GET /:id - Single setting (?clinic_id=xxx)
router.get("/:id", getById);

// POST / - Create setting
router.post("/", create);

// POST /bulk - Create multiple settings
router.post("/bulk", createBulk);

// PUT /:id - Update setting
router.put("/:id", update);

// DELETE /:id - Delete setting (?clinic_id=xxx)
router.delete("/:id", remove);

export default router;