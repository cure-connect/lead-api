import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middlware";

export const uploadSlipController = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.clinicId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const slipUrl = `/uploads/slips/${req.file.filename}`;

        res.status(200).json({
            message: "Upload success",
            data: {
                url: slipUrl,
                filename: req.file.filename,
                size: req.file.size,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Upload failed",
            error: error.message,
        });
    }
};