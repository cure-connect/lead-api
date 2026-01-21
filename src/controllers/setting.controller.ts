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
    createSettings,
    getAllSettingByType,
    editSetting,
    deleteSetting
} from "../services/setting.service";
import { AuthRequest } from "../middleware/auth.middlware";

type SettingType = "admin" | "branch" | "channel" | "interest";

// export const createSettingController = async (req: Request, res: Response) => {
//     try {
//         const { type, ...payload } = req.body;

//         if (!type) {
//             return res.status(400).json({
//                 message: "type is required",
//             });
//         }

//         let data;

//         switch (type as SettingType) {
//             case "admin":
//                 data = await createAdmin(payload);
//                 break;

//             case "branch":
//                 data = await createBranch(payload);
//                 break;

//             case "channel":
//                 data = await createChannel(payload);
//                 break;

//             case "interest":
//                 data = await createInterest(payload);
//                 break;

//             default:
//                 return res.status(400).json({
//                     message: "Invalid type. Must be admin | branch | channel | interest",
//                 });
//         }

//         res.status(201).json({
//             type,
//             data,
//         });
//     } catch (err: any) {
//         res.status(500).json({ message: err.message });
//     }
// };

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

        let data;

        switch (type as SettingType) {
            case "admin":
                data = await createSettings(clinicId, type, payload);
                break;

            case "branch":
                data = await createSettings(clinicId, type, payload);
                break;

            case "channel":
                data = await createSettings(clinicId, type, payload);
                break;

            case "interest":
                data = await createSettings(clinicId, type, payload);
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
        console.log('error', err)
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

        const [admins, branches, channels, interests] = await Promise.all([
            getAllSettingByType(clinicId, "admin"),
            getAllSettingByType(clinicId, "branch"),
            getAllSettingByType(clinicId, "channel"),
            getAllSettingByType(clinicId, "interest"),
        ]);

        const formatItems = (items: any[], includePrice = false) =>
            items.map((item: any) => ({
                _id: item._id || item.id,
                name: item.name,
                ...(includePrice && { price: item.price })
            }));

        res.status(200).json({
            admins: formatItems(admins),
            branches: formatItems(branches),
            channels: formatItems(channels),
            interests: formatItems(interests, true),
        });
    } catch (err: any) {
        console.log('error', err);
        res.status(500).json({ message: err.message });
    }
};

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
        console.log('error', err)
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
