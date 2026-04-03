import { Request, Response } from "express";
import logger from "../../services/logger.service";

/**
 * Upload Controller for External API
 * Reuses same multer middleware as internal
 */

// === Single File ===

export const uploadSlip = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "No file uploaded. Use field name 'slip'" },
            });
        }

        const slipUrl = `/uploads/slips/${req.file.filename}`;

        logger.info("External API: Slip uploaded", {
            filename: req.file.filename,
            size: req.file.size,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Upload success",
            data: {
                url: slipUrl,
                filename: req.file.filename,
                size: req.file.size,
            },
        });
    } catch (error: any) {
        logger.error("External API: Slip upload failed", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Upload failed" },
        });
    }
};

export const uploadReceipt = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "No file uploaded. Use field name 'receipt'" },
            });
        }

        const receiptUrl = `/uploads/receipts/${req.file.filename}`;

        logger.info("External API: Receipt uploaded", {
            filename: req.file.filename,
            size: req.file.size,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Upload success",
            data: {
                url: receiptUrl,
                filename: req.file.filename,
                size: req.file.size,
            },
        });
    } catch (error: any) {
        logger.error("External API: Receipt upload failed", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Upload failed" },
        });
    }
};

// === Multiple Files ===

export const uploadSlips = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "No files uploaded. Use field name 'slips'" },
            });
        }

        const uploadedFiles = files.map((file) => ({
            url: `/uploads/slips/${file.filename}`,
            filename: file.filename,
            size: file.size,
        }));

        logger.info("External API: Slips uploaded", {
            count: uploadedFiles.length,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Upload success",
            data: {
                urls: uploadedFiles.map((f) => f.url),
                files: uploadedFiles,
                count: uploadedFiles.length,
            },
        });
    } catch (error: any) {
        logger.error("External API: Slips upload failed", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Upload failed" },
        });
    }
};

export const uploadReceipts = async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "No files uploaded. Use field name 'receipts'" },
            });
        }

        const uploadedFiles = files.map((file) => ({
            url: `/uploads/receipts/${file.filename}`,
            filename: file.filename,
            size: file.size,
        }));

        logger.info("External API: Receipts uploaded", {
            count: uploadedFiles.length,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Upload success",
            data: {
                urls: uploadedFiles.map((f) => f.url),
                files: uploadedFiles,
                count: uploadedFiles.length,
            },
        });
    } catch (error: any) {
        logger.error("External API: Receipts upload failed", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Upload failed" },
        });
    }
};