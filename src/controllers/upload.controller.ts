import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middlware";

// Single file upload
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

export const uploadReceiptController = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.clinicId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const receiptUrl = `/uploads/receipts/${req.file.filename}`;

        res.status(200).json({
            message: "Upload success",
            data: {
                url: receiptUrl,
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

// Multiple files upload
export const uploadSlipsController = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.clinicId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const uploadedFiles = files.map(file => ({
            url: `/uploads/slips/${file.filename}`,
            filename: file.filename,
            size: file.size,
        }));

        res.status(200).json({
            message: "Upload success",
            data: {
                urls: uploadedFiles.map(f => f.url),
                files: uploadedFiles,
                count: uploadedFiles.length,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Upload failed",
            error: error.message,
        });
    }
};

export const uploadReceiptsController = async (req: AuthRequest, res: Response) => {
    try {
        if (!req.user?.clinicId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded" });
        }

        const uploadedFiles = files.map(file => ({
            url: `/uploads/receipts/${file.filename}`,
            filename: file.filename,
            size: file.size,
        }));

        res.status(200).json({
            message: "Upload success",
            data: {
                urls: uploadedFiles.map(f => f.url),
                files: uploadedFiles,
                count: uploadedFiles.length,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            message: "Upload failed",
            error: error.message,
        });
    }
};