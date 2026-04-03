import crypto from "crypto";
import { ApiKeyModel, ApiKeyDocument } from "../models/api-key";
import logger from "../services/logger.service";

// ============================================
// Types
// ============================================

interface CreateApiKeyInput {
  name: string;
  permissions?: string[];
  rateLimit?: number;
  expiresAt?: Date;
  contactEmail?: string;
  metadata?: {
    contactName?: string;
    company?: string;
    description?: string;
  };
  createdBy?: string;
}

interface CreateApiKeyResult {
  apiKey: string;           // ⚠️ แสดงครั้งเดียว
  keyPrefix: string;
  document: ApiKeyDocument;
}

// ============================================
// Helper Functions
// ============================================

const generateKey = (prefix: string = "curedent_ext"): { apiKey: string; keyHash: string; keyPrefix: string } => {
  const randomPart = crypto.randomBytes(32).toString("hex");
  const apiKey = `${prefix}_${randomPart}`;
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const keyPrefix = apiKey.substring(0, 12) + "...";

  return { apiKey, keyHash, keyPrefix };
};

const hashKey = (apiKey: string): string => {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
};

// ============================================
// Create API Key (Admin)
// ============================================

/**
 * Admin สร้าง API Key
 * ⚠️ apiKey จะแสดงครั้งเดียวเท่านั้น
 */
export const createApiKey = async (input: CreateApiKeyInput): Promise<CreateApiKeyResult> => {
  const { apiKey, keyHash, keyPrefix } = generateKey();

  const doc = await ApiKeyModel.create({
    name: input.name,
    keyHash,
    keyPrefix,
    permissions: input.permissions || ["read:leads"],
    rateLimit: input.rateLimit || 100,
    expiresAt: input.expiresAt,
    contactEmail: input.contactEmail,
    metadata: input.metadata,
    createdBy: input.createdBy,
    isActive: true,
  });

  logger.info("API Key created", {
    keyId: doc._id,
    name: input.name,
    keyPrefix,
    createdBy: input.createdBy,
  });

  return {
    apiKey,      // ⚠️ ส่งให้ Partner เก็บไว้
    keyPrefix,
    document: doc,
  };
};

// ============================================
// Validate API Key (for Auth Middleware)
// ============================================

/**
 * Validate API Key
 * Return: ApiKeyDocument if valid, null if invalid
 */
export const validateApiKey = async (apiKey: string): Promise<ApiKeyDocument | null> => {
  const keyHash = hashKey(apiKey);

  const doc = await ApiKeyModel.findOne({
    keyHash,
    isActive: true,
  });

  if (!doc) return null;

  // Check expiration
  if (doc.expiresAt && new Date() > doc.expiresAt) {
    return null;
  }

  // Update last used
  await ApiKeyModel.updateOne(
    { _id: doc._id },
    {
      $set: { lastUsedAt: new Date() },
      $inc: { usageCount: 1 },
    }
  );

  return doc;
};

// ============================================
// CRUD Functions
// ============================================

interface UpdateApiKeyInput {
  name?: string;
  permissions?: string[];
  rateLimit?: number;
  isActive?: boolean;
  expiresAt?: Date;
  contactEmail?: string;
  metadata?: {
    contactName?: string;
    company?: string;
    description?: string;
  };
}

/**
 * ดึง API Keys ทั้งหมด
 */
export const findAllApiKeys = async () => {
  return ApiKeyModel.find()
    .select("-keyHash")
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * ดึง API Key by ID
 */
export const findApiKeyById = async (id: string) => {
  return ApiKeyModel.findById(id).select("-keyHash").lean();
};

/**
 * อัพเดท API Key
 */
export const updateApiKey = async (id: string, data: UpdateApiKeyInput) => {
  const doc = await ApiKeyModel.findByIdAndUpdate(
    id,
    { $set: data },
    { new: true }
  ).select("-keyHash").lean();

  if (doc) {
    logger.info("API Key updated", { keyId: id, name: doc.name });
  }

  return doc;
};

/**
 * Revoke (ปิดใช้งาน) API Key
 */
export const revokeApiKey = async (id: string) => {
  const doc = await ApiKeyModel.findByIdAndUpdate(
    id,
    { $set: { isActive: false } },
    { new: true }
  ).select("-keyHash").lean();

  if (doc) {
    logger.warn("API Key revoked", { keyId: id, name: doc.name });
  }

  return doc;
};

/**
 * ลบ API Key
 */
export const deleteApiKey = async (id: string) => {
  const doc = await ApiKeyModel.findByIdAndDelete(id);

  if (doc) {
    logger.warn("API Key deleted", { keyId: id, name: doc.name });
  }

  return doc;
};

/**
 * Regenerate API Key (สร้าง key ใหม่)
 */
export const regenerateApiKey = async (id: string): Promise<CreateApiKeyResult | null> => {
  const existing = await ApiKeyModel.findById(id);
  if (!existing) return null;

  const { apiKey, keyHash, keyPrefix } = generateKey();

  existing.keyHash = keyHash;
  existing.keyPrefix = keyPrefix;
  existing.usageCount = 0;
  existing.lastUsedAt = undefined;
  await existing.save();

  logger.info("API Key regenerated", { keyId: id, name: existing.name });

  return {
    apiKey,
    keyPrefix,
    document: existing,
  };
};

/**
 * ดึง Usage Stats
 */
export const getApiKeyStats = async () => {
  const stats = await ApiKeyModel.aggregate([
    {
      $group: {
        _id: "$isActive",
        count: { $sum: 1 },
        totalUsage: { $sum: "$usageCount" },
      },
    },
  ]);

  const topUsers = await ApiKeyModel.find({ isActive: true })
    .select("name keyPrefix usageCount lastUsedAt contactEmail")
    .sort({ usageCount: -1 })
    .limit(10)
    .lean();

  // สรุป
  let total = 0, active = 0, inactive = 0, totalUsage = 0;
  stats.forEach((s) => {
    if (s._id === true) {
      active = s.count;
    } else {
      inactive = s.count;
    }
    total += s.count;
    totalUsage += s.totalUsage;
  });

  return {
    summary: { total, active, inactive, totalUsage },
    topUsers,
  };
};

/**
 * ดึงรายการ Permissions ที่ใช้ได้
 */
export const getAvailablePermissions = () => {
  return [
    { value: "*", label: "All Permissions", description: "สิทธิ์ทั้งหมด" },
    { value: "read:leads", label: "Read Leads", description: "ดูข้อมูล Leads" },
    { value: "write:leads", label: "Write Leads", description: "สร้าง/แก้ไข/ลบ Leads" },
    { value: "read:activity", label: "Read Activity", description: "ดู Activity Logs" },
    { value: "write:activity", label: "Write Activity", description: "สร้าง Activity Logs" },
    { value: "read:stats", label: "Read Stats", description: "ดูสถิติ" },
    { value: "read:users", label: "Read Users", description: "ดูข้อมูล Users" },
    { value: "write:users", label: "Write Users", description: "สร้าง/แก้ไข/ลบ Users" },
    { value: "read:settings", label: "Read Settings", description: "ดูข้อมูล Settings (interest, procedure, referralChannel)" },
    { value: "write:settings", label: "Write Settings", description: "สร้าง/แก้ไข/ลบ Settings" },
  ];
};