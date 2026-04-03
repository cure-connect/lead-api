import { Request, Response } from "express";
import {
    createSettings,
    getAllSettingByType,
    editSetting,
    deleteSetting,
} from "../../services/setting.service";
import { SettingModel, SettingType } from "../../models/setting";
import logger from "../../services/logger.service";

/**
 * Setting Controller for External API
 * Full CRUD access to settings per clinic
 */

const VALID_TYPES: SettingType[] = ["admin", "branch", "channel", "interest"];

/**
 * GET /
 * List all settings for a clinic
 * Query: ?clinic_id=xxx&type=interest|procedure|referralChannel
 */
export const listSettings = async (req: Request, res: Response) => {
    try {
        const { clinic_id, type } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id query parameter is required",
                },
            });
        }

        const clinicId = parseInt(clinic_id as string);
        const query: any = { clinicId };

        if (type) {
            if (!VALID_TYPES.includes(type as SettingType)) {
                return res.status(400).json({
                    success: false,
                    error: {
                        code: "VALIDATION_ERROR",
                        message: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
                    },
                });
            }
            query.type = type;
        }

        const settings = await SettingModel.find(query).sort({ createdAt: -1 }).lean();

        res.json({
            success: true,
            data: settings,
            count: settings.length,
        });
    } catch (error: any) {
        logger.error("External API: Failed to list settings", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve settings" },
        });
    }
};

/**
 * GET /types
 * Get available setting types
 */
export const getTypes = async (req: Request, res: Response) => {
    res.json({
        success: true,
        data: VALID_TYPES.map((t) => ({
            value: t,
            label: t.charAt(0).toUpperCase() + t.slice(1),
        })),
    });
};

/**
 * GET /:id
 * Get single setting by ID
 */
export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id query parameter is required",
                },
            });
        }

        const clinicId = parseInt(clinic_id as string);
        const setting = await SettingModel.findOne({ _id: id, clinicId }).lean();

        if (!setting) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Setting not found" },
            });
        }

        res.json({ success: true, data: setting });
    } catch (error: any) {
        logger.error("External API: Failed to get setting", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve setting" },
        });
    }
};

/**
 * GET /clinic/:clinicId/:type
 * Get settings by clinic and type
 */
export const getByClinicAndType = async (req: Request, res: Response) => {
    try {
        const { clinicId, type } = req.params;

        if (!VALID_TYPES.includes(type as SettingType)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}`,
                },
            });
        }

        const settings = await getAllSettingByType(parseInt(clinicId), type as SettingType);

        res.json({
            success: true,
            data: settings,
            count: settings.length,
        });
    } catch (error: any) {
        logger.error("External API: Failed to get settings by clinic/type", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve settings" },
        });
    }
};

/**
 * POST /
 * Create new setting
 */
export const create = async (req: Request, res: Response) => {
    try {
        const { clinic_id, type, name } = req.body;

        // Validation
        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id is required",
                },
            });
        }

        if (!type || !VALID_TYPES.includes(type as SettingType)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: `type is required and must be one of: ${VALID_TYPES.join(", ")}`,
                },
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "name is required",
                },
            });
        }

        const clinicId = parseInt(clinic_id);
        const setting = await createSettings(clinicId, type as SettingType, { name });

        logger.info("External API: Setting created", {
            settingId: (setting as any)._id,
            clinicId,
            type,
            apiKey: (req as any).apiKey?.name,
        });

        res.status(201).json({
            success: true,
            message: "Setting created successfully",
            data: setting,
        });
    } catch (error: any) {
        logger.error("External API: Failed to create setting", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create setting" },
        });
    }
};

/**
 * POST /bulk
 * Create multiple settings at once
 */
export const createBulk = async (req: Request, res: Response) => {
    try {
        const { clinic_id, type, names } = req.body;

        // Validation
        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id is required",
                },
            });
        }

        if (!type || !VALID_TYPES.includes(type as SettingType)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: `type is required and must be one of: ${VALID_TYPES.join(", ")}`,
                },
            });
        }

        if (!names || !Array.isArray(names) || names.length === 0) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "names must be a non-empty array",
                },
            });
        }

        const clinicId = parseInt(clinic_id);
        const created = [];

        for (const name of names) {
            if (name && typeof name === "string") {
                const setting = await createSettings(clinicId, type as SettingType, { name });
                created.push(setting);
            }
        }

        logger.info("External API: Settings bulk created", {
            clinicId,
            type,
            count: created.length,
            apiKey: (req as any).apiKey?.name,
        });

        res.status(201).json({
            success: true,
            message: `${created.length} settings created successfully`,
            data: created,
            count: created.length,
        });
    } catch (error: any) {
        logger.error("External API: Failed to bulk create settings", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create settings" },
        });
    }
};

/**
 * PUT /:id
 * Update setting
 */
export const update = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, name } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id is required in body",
                },
            });
        }

        if (!name) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "name is required",
                },
            });
        }

        const clinicId = parseInt(clinic_id);

        // Check if exists
        const existing = await SettingModel.findOne({ _id: id, clinicId }).lean();
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Setting not found" },
            });
        }

        const setting = await editSetting(clinicId, id, { name });

        logger.info("External API: Setting updated", {
            settingId: id,
            clinicId,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Setting updated successfully",
            data: setting,
        });
    } catch (error: any) {
        logger.error("External API: Failed to update setting", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to update setting" },
        });
    }
};

/**
 * DELETE /:id
 * Delete setting
 */
export const remove = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic_id query parameter is required",
                },
            });
        }

        const clinicId = parseInt(clinic_id as string);

        // Check if exists
        const existing = await SettingModel.findOne({ _id: id, clinicId }).lean();
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Setting not found" },
            });
        }

        await deleteSetting(clinicId, id);

        logger.info("External API: Setting deleted", {
            settingId: id,
            clinicId,
            name: existing.name,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Setting deleted successfully",
        });
    } catch (error: any) {
        logger.error("External API: Failed to delete setting", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to delete setting" },
        });
    }
};