import { Response } from "express";
import {
    createSettings,
    getAllSettingByType,
    editSetting,
    deleteSetting
} from "../services/setting.service";
import { AuthRequest } from "../middleware/auth.middlware";

type SettingType = "admin" | "branch" | "channel" | "interest";

export const createSettingController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId

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

        const validTypes: SettingType[] = ["admin", "branch", "channel", "interest"];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                message: "Invalid type. Must be admin | branch | channel | interest",
            });
        }

        const data = await createSettings(clinicId, type, payload);

        res.status(201).json({
            type,
            data,
        });
    } catch (err: any) {
        console.log('error', err);

        if (err.code === 11000) {
            return res.status(409).json({
                message: `"${req.body.name}" มีอยู่ในระบบแล้ว`,
                code: "DUPLICATE"
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

        const [admins, interests, branches, channels] = await Promise.all([
            getAllSettingByType(clinicId, "admin"),
            getAllSettingByType(clinicId, "interest"),
            getAllSettingByType(clinicId, "branch"),
            getAllSettingByType(clinicId, "channel"),
        ]);

        res.status(200).json({
            admins,
            interests,
            branches,
            channels,
        });

    } catch (err: any) {
        console.log('error', err)
        res.status(500).json({ message: err.message });
    }
}

export const editSettingController = async (req: AuthRequest, res: Response) => {
    try {

        const clinicId = req.user?.clinicId
        const { id } = req.params

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

        let data;

        switch (type as SettingType) {
            case "admin":
                data = await editSetting(clinicId, id, payload);
                break;

            case "branch":
                data = await editSetting(clinicId, id, payload);
                break;

            case "channel":
                data = await editSetting(clinicId, id, payload);
                break;

            case "interest":
                data = await editSetting(clinicId, id, payload);
                break;

            default:
                return res.status(400).json({
                    message: "Invalid type. Must be admin | branch | channel | interest",
                });
        }

        res.status(201).json({
            type,
            data,
        });
    } catch (err: any) {
        console.log('error', err);

        if (err.code === 11000) {
            return res.status(409).json({
                message: `"${req.body.name}" มีอยู่ในระบบแล้ว`,
                code: "DUPLICATE"
            });
        }

        res.status(500).json({ message: err.message });
    }
}

export const deleteSettingController = async (
    req: AuthRequest,
    res: Response
) => {
    try {
        const clinicId = req.user?.clinicId;
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

        res.status(200).json({
            message: "Setting deleted successfully",
            data,
        });
    } catch (err: any) {
        console.log("error", err);
        res.status(500).json({ message: err.message });
    }
};