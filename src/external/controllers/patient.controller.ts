import { Request, Response } from "express";
import {
    createPatient,
    searchPatients,
    getPatientById,
    updatePatient,
    getAllPatients,
    addDeposit,
    useDeposit,
    refundDeposit,
    adjustBalance,
    getTransactionHistory,
    getPatientAppointments,
    checkTelDuplicate,
} from "../../services/patient.service";
import { logActivity } from "../../services/activity.service";
import logger from "../../services/logger.service";

/**
 * Patient Controller for External API
 * CRUD + Wallet Operations
 */

// ============================================
// Patient CRUD
// ============================================

/**
 * GET /
 * List patients with filters
 */
export const listPatients = async (req: Request, res: Response) => {
    try {
        const { clinic_id, page, limit, search, has_balance } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        const clinicId = parseInt(clinic_id as string);

        const result = await getAllPatients(clinicId, {
            page: page ? parseInt(page as string) : 1,
            limit: limit ? Math.min(parseInt(limit as string), 100) : 50,
            search: search as string,
            hasBalance: has_balance === "true",
        });

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error: any) {
        logger.error("External API: Failed to list patients", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve patients" },
        });
    }
};

/**
 * GET /search
 * Search patients (autocomplete)
 */
export const search = async (req: Request, res: Response) => {
    try {
        const { clinic_id, q, limit } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        if (!q || typeof q !== "string") {
            return res.json({ success: true, data: [] });
        }

        const clinicId = parseInt(clinic_id as string);
        const patients = await searchPatients(
            clinicId,
            q,
            limit ? Math.min(parseInt(limit as string), 50) : 10
        );

        res.json({ success: true, data: patients });
    } catch (error: any) {
        logger.error("External API: Failed to search patients", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to search patients" },
        });
    }
};

/**
 * GET /check-tel
 * Check duplicate phone number
 */
export const checkTel = async (req: Request, res: Response) => {
    try {
        const { clinic_id, tel, exclude_id } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        if (!tel || (tel as string).trim().length < 9) {
            return res.json({ success: true, exists: false });
        }

        const clinicId = parseInt(clinic_id as string);
        const existing = await checkTelDuplicate(clinicId, tel as string, exclude_id as string);

        res.json({
            success: true,
            exists: !!existing,
            patient: existing
                ? {
                    _id: existing._id,
                    fullname: existing.fullname,
                    nickname: existing.nickname,
                    tel: existing.tel,
                }
                : null,
        });
    } catch (error: any) {
        logger.error("External API: Failed to check tel", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to check phone number" },
        });
    }
};

/**
 * GET /:id
 * Get patient by ID
 */
export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        const clinicId = parseInt(clinic_id as string);
        const patient = await getPatientById(id, clinicId);

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        res.json({ success: true, data: patient });
    } catch (error: any) {
        logger.error("External API: Failed to get patient", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve patient" },
        });
    }
};

/**
 * POST /
 * Create new patient
 */
export const create = async (req: Request, res: Response) => {
    try {
        const { clinic_id, fullname, nickname, tel, socialMedia, note, interest, referralChannel, branch, createdBy } =
            req.body;

        // Validation
        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required" },
            });
        }

        if (!fullname) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "fullname is required" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = createdBy || (req as any).apiKey?.name || "external_api";

        const patient = await createPatient(
            clinicId,
            { fullname, nickname, tel, socialMedia, note, interest, referralChannel, branch },
            userName
        );

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "create",
                resource: "patient",
                resourceId: patient._id?.toString(),
                resourceName: fullname,
                description: `สร้างข้อมูลคนไข้: ${fullname} (via External API)`,
                metadata: { source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        logger.info("External API: Patient created", {
            patientId: patient._id,
            clinicId,
            apiKey: (req as any).apiKey?.name,
        });

        res.status(201).json({
            success: true,
            message: "Patient created successfully",
            data: patient,
        });
    } catch (error: any) {
        logger.error("External API: Failed to create patient", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create patient" },
        });
    }
};

/**
 * PUT /:id
 * Update patient
 */
export const update = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, fullname, nickname, tel, socialMedia, note, updatedBy } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required in body" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = updatedBy || (req as any).apiKey?.name || "external_api";

        const patient = await updatePatient(id, clinicId, {
            fullname,
            nickname,
            tel,
            socialMedia,
            note,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "update",
                resource: "patient",
                resourceId: id,
                resourceName: patient.fullname,
                description: `แก้ไขข้อมูลคนไข้: ${patient.fullname} (via External API)`,
                metadata: { source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        logger.info("External API: Patient updated", {
            patientId: id,
            clinicId,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Patient updated successfully",
            data: patient,
        });
    } catch (error: any) {
        logger.error("External API: Failed to update patient", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to update patient" },
        });
    }
};

/**
 * GET /:id/appointments
 * Get patient's appointment history
 */
export const getAppointments = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        const clinicId = parseInt(clinic_id as string);
        const appointments = await getPatientAppointments(id, clinicId);

        res.json({
            success: true,
            data: appointments,
            count: appointments.length,
        });
    } catch (error: any) {
        logger.error("External API: Failed to get patient appointments", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve appointments" },
        });
    }
};

// ============================================
// Wallet Operations
// ============================================

/**
 * GET /:id/transactions
 * Get transaction history
 */
export const getTransactions = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, limit, skip } = req.query;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id query parameter is required" },
            });
        }

        const clinicId = parseInt(clinic_id as string);
        const result = await getTransactionHistory(id, clinicId, {
            limit: limit ? parseInt(limit as string) : 50,
            skip: skip ? parseInt(skip as string) : 0,
        });

        if (!result) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        res.json({ success: true, data: result });
    } catch (error: any) {
        logger.error("External API: Failed to get transactions", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve transactions" },
        });
    }
};

/**
 * POST /:id/deposit
 * Add deposit to patient wallet
 */
export const addDepositController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, amount, description, appointmentId, createdBy } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required" },
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "amount must be positive" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = createdBy || (req as any).apiKey?.name || "external_api";

        const patient = await addDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: userName,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "create",
                resource: "patient_deposit",
                resourceId: id,
                resourceName: patient.fullname,
                description: `เพิ่มเงินมัดจำ ${amount.toLocaleString()} บาท ให้ ${patient.fullname} (via External API)`,
                metadata: { amount, newBalance: patient.balance, source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        res.json({
            success: true,
            message: `เพิ่มเงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (error: any) {
        logger.error("External API: Failed to add deposit", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to add deposit" },
        });
    }
};

/**
 * POST /:id/use-deposit
 * Use deposit from patient wallet
 */
export const useDepositController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, amount, description, appointmentId, createdBy } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required" },
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "amount must be positive" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = createdBy || (req as any).apiKey?.name || "external_api";

        const patient = await useDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: userName,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "update",
                resource: "patient_deposit",
                resourceId: id,
                resourceName: patient.fullname,
                description: `ใช้เงินมัดจำ ${amount.toLocaleString()} บาท ของ ${patient.fullname} (via External API)`,
                metadata: { amount, newBalance: patient.balance, source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        res.json({
            success: true,
            message: `ใช้เงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (error: any) {
        if (error.message.includes("Insufficient balance")) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "INSUFFICIENT_BALANCE",
                    message: "ยอดเงินมัดจำไม่เพียงพอ",
                    details: error.message,
                },
            });
        }

        logger.error("External API: Failed to use deposit", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to use deposit" },
        });
    }
};

/**
 * POST /:id/refund
 * Refund deposit
 */
export const refundDepositController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, amount, description, appointmentId, createdBy } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required" },
            });
        }

        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "amount must be positive" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = createdBy || (req as any).apiKey?.name || "external_api";

        const patient = await refundDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: userName,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "update",
                resource: "patient_deposit",
                resourceId: id,
                resourceName: patient.fullname,
                description: `คืนเงินมัดจำ ${amount.toLocaleString()} บาท ให้ ${patient.fullname} (via External API)`,
                metadata: { amount, newBalance: patient.balance, source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        res.json({
            success: true,
            message: `คืนเงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (error: any) {
        logger.error("External API: Failed to refund deposit", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to refund deposit" },
        });
    }
};

/**
 * POST /:id/adjust
 * Adjust balance (admin)
 */
export const adjustBalanceController = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { clinic_id, amount, description, createdBy } = req.body;

        if (!clinic_id) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "clinic_id is required" },
            });
        }

        if (amount === undefined || amount === 0) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "amount is required and cannot be 0" },
            });
        }

        if (!description) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "description is required for adjustment" },
            });
        }

        const clinicId = parseInt(clinic_id);
        const userName = createdBy || (req as any).apiKey?.name || "external_api";

        const patient = await adjustBalance(id, clinicId, amount, {
            description,
            createdBy: userName,
        });

        if (!patient) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Patient not found" },
            });
        }

        // Log activity
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName,
                action: "update",
                resource: "patient_balance",
                resourceId: id,
                resourceName: patient.fullname,
                description: `ปรับยอดเงิน ${amount > 0 ? "+" : ""}${amount.toLocaleString()} บาท ของ ${patient.fullname} (via External API)`,
                metadata: { amount, description, newBalance: patient.balance, source: "external_api" },
                clinicId,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        res.json({
            success: true,
            message: `ปรับยอดเงิน ${amount > 0 ? "+" : ""}${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (error: any) {
        logger.error("External API: Failed to adjust balance", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to adjust balance" },
        });
    }
};