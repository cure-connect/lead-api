import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middlware";
import {
  createApiKeyController,
  getAllApiKeysController,
  getApiKeyByIdController,
  getApiKeyStatsController,
  getPermissionsController,
  updateApiKeyController,
  revokeApiKeyController,
  regenerateApiKeyController,
  deleteApiKeyController,
} from "../controllers/api-key.controller";

const router = Router();

// ⚠️ ทุก route ต้อง login (JWT auth)
router.use(authMiddleware);

/**
 * Admin Routes สำหรับจัดการ API Keys
 * Base: /api/admin/api-keys
 */

// Info
router.get("/permissions", getPermissionsController); // ดู permissions ที่ใช้ได้
router.get("/stats", getApiKeyStatsController);       // Usage stats

// CRUD
router.post("/", createApiKeyController);          // สร้าง API Key
router.get("/", getAllApiKeysController);          // List ทั้งหมด
router.get("/:id", getApiKeyByIdController);       // Get by ID
router.put("/:id", updateApiKeyController);        // Update
router.delete("/:id", deleteApiKeyController);     // Delete

// Actions
router.post("/:id/revoke", revokeApiKeyController);       // ปิดใช้งาน
router.post("/:id/regenerate", regenerateApiKeyController); // สร้าง Key ใหม่

export default router;