import { SettingModel, SettingType } from "../models/setting";

export const createSettings = async (
    clinicId: number,
    type: SettingType,
    payload: { name: string }
) => {
    return SettingModel.create({
        clinicId,
        type,
        name: payload.name,
    });
};

export const getAllSettingByType = async (
    clinicId: number,
    type: SettingType
) => {
    return SettingModel.find({ clinicId, type }).lean();
};

export const editSetting = async (
    clinicId: number,
    id: string,
    payload: { name?: string }
) => {
    const update: any = {};
    if (payload.name) update.name = payload.name;

    return SettingModel.findOneAndUpdate(
        { _id: id, clinicId: clinicId },
        { $set: update },
        { new: true, lean: true }
    );
};

export const deleteSetting = async (clinicId: number, id: string) => {
    return SettingModel.findOneAndDelete({ _id: id, clinicId }).lean();
};