import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middlware";
import {
  createApiKey,
  findAllApiKeys,
  findApiKeyById,
  updateApiKey,
  revokeApiKey,
  deleteApiKey,
  regenerateApiKey,
  getApiKeyStats,
  getAvailablePermissions,
} from "../services/api-key.service";

/**
 * Admin Controller สำหรับจัดการ API Keys
 * ⚠️ ทุก endpoint ต้อง JWT auth
 */

/**
 * GET /api/admin/api-keys/permissions
 * ดูรายการ permissions ที่ใช้ได้
 */
export const getPermissionsController = async (req: AuthRequest, res: Response) => {
  try {
    const permissions = getAvailablePermissions();

    res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "ดึงข้อมูลไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/api-keys
 * สร้าง API Key ใหม่
 * ⚠️ apiKey จะแสดงครั้งเดียวเท่านั้น
 */
export const createApiKeyController = async (req: AuthRequest, res: Response) => {
  try {
    const { name, permissions, rateLimit, expiresAt, contactEmail, metadata } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "name จำเป็นต้องระบุ",
      });
    }

    const result = await createApiKey({
      name,
      permissions,
      rateLimit,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      contactEmail,
      metadata,
      createdBy: req.user?.username || "admin",
    });

    res.status(201).json({
      success: true,
      message: "สร้าง API Key สำเร็จ",
      data: {
        // ⚠️ apiKey แสดงครั้งเดียว!
        apiKey: result.apiKey,
        keyPrefix: result.keyPrefix,
        id: result.document._id,
        name: result.document.name,
        permissions: result.document.permissions,
        rateLimit: result.document.rateLimit,
        expiresAt: result.document.expiresAt,
      },
      warning: "⚠️ API Key จะแสดงครั้งเดียวเท่านั้น กรุณาบันทึกไว้ส่งให้ Partner",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "สร้าง API Key ไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/api-keys
 * ดึง API Keys ทั้งหมด
 */
export const getAllApiKeysController = async (req: AuthRequest, res: Response) => {
  try {
    const keys = await findAllApiKeys();

    res.status(200).json({
      success: true,
      data: keys,
      count: keys.length,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "ดึงข้อมูลไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/api-keys/stats
 * ดึง Usage Stats
 */
export const getApiKeyStatsController = async (req: AuthRequest, res: Response) => {
  try {
    const stats = await getApiKeyStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "ดึงสถิติไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * GET /api/admin/api-keys/:id
 * ดึง API Key by ID
 */
export const getApiKeyByIdController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const key = await findApiKeyById(id);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ API Key",
      });
    }

    res.status(200).json({
      success: true,
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "ดึงข้อมูลไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * PUT /api/admin/api-keys/:id
 * อัพเดท API Key
 */
export const updateApiKeyController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, permissions, rateLimit, isActive, expiresAt, contactEmail, metadata } = req.body;

    const key = await updateApiKey(id, {
      name,
      permissions,
      rateLimit,
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      contactEmail,
      metadata,
    });

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ API Key",
      });
    }

    res.status(200).json({
      success: true,
      message: "อัพเดทสำเร็จ",
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "อัพเดทไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/api-keys/:id/revoke
 * Revoke (ปิดใช้งาน) API Key
 */
export const revokeApiKeyController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const key = await revokeApiKey(id);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ API Key",
      });
    }

    res.status(200).json({
      success: true,
      message: "Revoke สำเร็จ",
      data: key,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Revoke ไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/api-keys/:id/regenerate
 * สร้าง API Key ใหม่ (Key เดิมจะใช้ไม่ได้)
 */
export const regenerateApiKeyController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await regenerateApiKey(id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ API Key",
      });
    }

    res.status(200).json({
      success: true,
      message: "Regenerate สำเร็จ",
      data: {
        apiKey: result.apiKey,
        keyPrefix: result.keyPrefix,
        id: result.document._id,
        name: result.document.name,
      },
      warning: "⚠️ API Key ใหม่! Key เดิมใช้ไม่ได้แล้ว กรุณาส่งให้ Partner",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Regenerate ไม่สำเร็จ",
      error: error.message,
    });
  }
};

/**
 * DELETE /api/admin/api-keys/:id
 * ลบ API Key
 */
export const deleteApiKeyController = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const key = await deleteApiKey(id);

    if (!key) {
      return res.status(404).json({
        success: false,
        message: "ไม่พบ API Key",
      });
    }

    res.status(200).json({
      success: true,
      message: "ลบสำเร็จ",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "ลบไม่สำเร็จ",
      error: error.message,
    });
  }
};