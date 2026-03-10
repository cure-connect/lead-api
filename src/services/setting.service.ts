import { SettingModel, SettingType } from "../models/setting";
import logger from "./logger.service";

export const createSettings = async (
    clinicId: number,
    type: SettingType,
    payload: { name: string }
) => {
    try {
        const setting = await SettingModel.create({
            clinicId,
            type,
            name: payload.name,
        });

        logger.debug("Setting created", { clinicId, type, name: payload.name });

        return setting;
    } catch (error: any) {
        logger.error("Failed to create setting", {
            error: error.message,
            clinicId,
            type,
        });
        throw error;
    }
};

export const getAllSettingByType = async (
    clinicId: number,
    type: SettingType
) => {
    try {
        const settings = await SettingModel.find({ clinicId, type }).lean();
        logger.debug("Settings fetched", { clinicId, type, count: settings.length });
        return settings;
    } catch (error: any) {
        logger.error("Failed to fetch settings", {
            error: error.message,
            clinicId,
            type,
        });
        throw error;
    }
};

export const editSetting = async (
    clinicId: number,
    id: string,
    payload: { name?: string }
) => {
    try {
        const update: any = {};
        if (payload.name) update.name = payload.name;

        const setting = await SettingModel.findOneAndUpdate(
            { _id: id, clinicId: clinicId },
            { $set: update },
            { new: true, lean: true }
        );

        if (setting) {
            logger.debug("Setting updated", { settingId: id, clinicId });
        }

        return setting;
    } catch (error: any) {
        logger.error("Failed to update setting", {
            error: error.message,
            settingId: id,
            clinicId,
        });
        throw error;
    }
};

export const deleteSetting = async (clinicId: number, id: string) => {
    try {
        const setting = await SettingModel.findOneAndDelete({ _id: id, clinicId }).lean();

        if (setting) {
            logger.debug("Setting deleted", { settingId: id, clinicId });
        }

        return setting;
    } catch (error: any) {
        logger.error("Failed to delete setting", {
            error: error.message,
            settingId: id,
            clinicId,
        });
        throw error;
    }
};