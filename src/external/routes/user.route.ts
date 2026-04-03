import { Router } from "express";
import {
    listUsers,
    getById,
    getByClinicId,
    create,
    update,
    remove,
} from "../controllers/user.controller";

const router = Router();

/**
 * User Routes (External API)
 * Base: /api/external/v1/users
 * 
 * Permissions:
 * - read:users  → GET endpoints
 * - write:users → POST, PUT, DELETE endpoints
 */

// GET / - List all users
router.get("/", listUsers);

// GET /clinic/:clinicId - By clinic ID
router.get("/clinic/:clinicId", getByClinicId);

// GET /:id - Single user (by _id, clinicId, or username)
router.get("/:id", getById);

// POST / - Create user
router.post("/", create);

// PUT /:id - Update user
router.put("/:id", update);

// DELETE /:id - Delete user
router.delete("/:id", remove);

export default router;