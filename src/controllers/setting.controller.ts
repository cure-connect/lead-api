import { Request, Response } from "express";
import {
    createAdmin,
    getAllAdmin,
    getAdminById,
    editAdminName,
    deleteAdminById,
    getAllBranch,
    getBranchById,
    editBranchName,
    deleteBranchById,
    createBranch,
    createChannel,
    createInterest,
} from "../services/setting.service";

type SettingType = "admin" | "branch" | "channel" | "interest";

export const createSettingController = async (req: Request, res: Response) => {
    try {
        const { type, ...payload } = req.body;

        if (!type) {
            return res.status(400).json({
                message: "type is required",
            });
        }

        let data;

        switch (type as SettingType) {
            case "admin":
                data = await createAdmin(payload);
                break;

            case "branch":
                data = await createBranch(payload);
                break;

            case "channel":
                data = await createChannel(payload);
                break;

            case "interest":
                data = await createInterest(payload);
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
        res.status(500).json({ message: err.message });
    }
};