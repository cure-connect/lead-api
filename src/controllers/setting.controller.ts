import { Response } from "express";
import {
  createSettings,
  getAllSettingByType,
  editSetting,
  deleteSetting,
} from "../services/setting.service";
import { UserModel } from "../models/user";
import { logActivity } from "../services/activity.service";
import { AuthRequest } from "../middleware/auth.middlware";

type SettingType = "admin" | "branch" | "channel" | "interest" | "procedure";

const settingTypeLabels: Record<SettingType, string> = {
  admin: "แอดมิน",
  branch: "สาขา",
  channel: "ช่องทาง",
  interest: "ความสนใจ",
  procedure: "ขั้นตอนการรักษา",
};

export const createSettingController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }
    const { type, ...payload } = req.body;

    if (!type) {
      return res.status(400).json({
        message: "type is required",
      });
    }

    const validTypes: SettingType[] = ["admin", "branch", "channel", "interest", "procedure"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be admin | branch | channel | interest | procedure",
      });
    }

    const data = await createSettings(clinicId, type, payload);

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "create",
      resource: "settings",
      resourceId: (data as any)._id?.toString(),
      resourceName: payload.name,
      description: `สร้าง ${settingTypeLabels[type as SettingType]}: ${payload.name}`,
      metadata: { type },
      clinicId,
      clinicName,
      req,
    });

    res.status(201).json({
      type,
      data,
    });
  } catch (err: any) {
    console.log("error", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: `"${req.body.name}" มีอยู่ในระบบแล้ว`,
        code: "DUPLICATE",
      });
    }

    res.status(500).json({ message: err.message });
  }
};

export const getAllSettingController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    // ดึง settings และ user config พร้อมกัน
    const [admins, interests, branches, channels, procedures, user] = await Promise.all([
      getAllSettingByType(clinicId, "admin"),
      getAllSettingByType(clinicId, "interest"),
      getAllSettingByType(clinicId, "branch"),
      getAllSettingByType(clinicId, "channel"),
      getAllSettingByType(clinicId, "procedure"),
      UserModel.findOne({ clinicId }).select("features").lean(),
    ]);

    const procedureConfig = user?.features?.procedure || {
      enabled: false,
      allowCustom: true,
    };

    res.status(200).json({
      admins,
      interests,
      branches,
      channels,
      procedures,
      config: {
        procedure: procedureConfig,
      },
    });
  } catch (err: any) {
    console.log("error", err);
    res.status(500).json({ message: err.message });
  }
};

export const editSettingController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;
    const { id } = req.params;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }
    const { type, ...payload } = req.body;

    if (!type) {
      return res.status(400).json({
        message: "type is required",
      });
    }

    const validTypes: SettingType[] = ["admin", "branch", "channel", "interest", "procedure"];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Must be admin | branch | channel | interest | procedure",
      });
    }

    const data = await editSetting(clinicId, id, payload);

    if (!data) {
      return res.status(404).json({ message: "Setting not found" });
    }

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "update",
      resource: "settings",
      resourceId: id,
      resourceName: payload.name || data.name,
      description: `แก้ไข ${settingTypeLabels[type as SettingType]}: ${payload.name || data.name}`,
      metadata: { type },
      clinicId,
      clinicName,
      req,
    });

    res.status(201).json({
      type,
      data,
    });
  } catch (err: any) {
    console.log("error", err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: `"${req.body.name}" มีอยู่ในระบบแล้ว`,
        code: "DUPLICATE",
      });
    }

    res.status(500).json({ message: err.message });
  }
};

export const deleteSettingController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;
    const { id } = req.params;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    if (!id) {
      return res.status(400).json({
        message: "id is required",
      });
    }

    const data = await deleteSetting(clinicId, id);

    if (!data) {
      return res.status(404).json({
        message: "Setting not found",
      });
    }

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "delete",
      resource: "settings",
      resourceId: id,
      resourceName: data.name,
      description: `ลบ Setting: ${data.name}`,
      metadata: {
        type: data.type,
        deletedData: data,
      },
      clinicId,
      clinicName,
      req,
    });

    res.status(200).json({
      message: "Setting deleted successfully",
      data,
    });
  } catch (err: any) {
    console.log("error", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * Toggle feature เปิด/ปิด
 * PATCH /setting/config/toggle
 */
export const toggleFeatureController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const { feature, enabled, allowCustom } = req.body;

    if (!feature) {
      return res.status(400).json({
        message: "feature is required",
      });
    }

    const validFeatures = ["procedure"];
    if (!validFeatures.includes(feature)) {
      return res.status(400).json({
        message: "Invalid feature. Must be: procedure",
      });
    }

    if (typeof enabled !== "boolean") {
      return res.status(400).json({
        message: "enabled must be boolean",
      });
    }

    // อัพเดทใน User model
    const updateData: any = {
      [`features.${feature}.enabled`]: enabled,
    };
    if (allowCustom !== undefined) {
      updateData[`features.${feature}.allowCustom`] = allowCustom;
    }

    const user = await UserModel.findOneAndUpdate(
      { clinicId },
      { $set: updateData },
      { new: true }
    ).select("features").lean();

    const featureConfig = user?.features?.[feature as "procedure"] || {
      enabled,
      allowCustom: allowCustom ?? true,
    };

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "update",
      resource: "settings",
      resourceName: `Feature: ${feature}`,
      description: `${enabled ? "เปิด" : "ปิด"} ${settingTypeLabels[feature as SettingType] || feature}`,
      metadata: { feature, enabled, allowCustom },
      clinicId,
      clinicName,
      req,
    });

    res.status(200).json({
      success: true,
      message: `${enabled ? "เปิด" : "ปิด"} ${settingTypeLabels[feature as SettingType] || feature} สำเร็จ`,
      data: featureConfig,
    });
  } catch (err: any) {
    console.log("error", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * ดึง config ของ clinic
 * GET /setting/config
 */
export const getConfigController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const user = await UserModel.findOne({ clinicId }).select("features").lean();

    const features = user?.features || {
      procedure: {
        enabled: false,
        allowCustom: true,
      },
    };

    res.status(200).json({
      success: true,
      data: features,
    });
  } catch (err: any) {
    console.log("error", err);
    res.status(500).json({ message: err.message });
  }
};