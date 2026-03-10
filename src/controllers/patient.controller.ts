import { Response } from "express";
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
} from "../services/patient.service";
import { logActivity } from "../services/activity.service";
import { AuthRequest } from "../middleware/auth.middlware";

/**
 * POST /patient
 * สร้างคนไข้ใหม่
 */
export const createPatientController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { fullname, nickname, tel, socialMedia, note } = req.body;

        if (!fullname) {
            return res.status(400).json({ message: "fullname is required" });
        }

        const patient = await createPatient(clinicId, {
            fullname,
            nickname,
            tel,
            socialMedia,
            note,
        }, username);

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "create",
            resource: "patient",
            resourceId: patient._id?.toString(),
            resourceName: fullname,
            description: `สร้างข้อมูลคนไข้: ${fullname}`,
            clinicId,
            clinicName,
            req,
        });

        res.status(201).json({
            success: true,
            data: patient,
        });
    } catch (err: any) {
        console.error("Error creating patient:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /patient/search?q=xxx
 * ค้นหาคนไข้ (สำหรับ autocomplete)
 */
export const searchPatientsController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { q, limit } = req.query;

        if (!q || typeof q !== "string") {
            return res.json({ success: true, data: [] });
        }

        const patients = await searchPatients(
            clinicId,
            q,
            limit ? parseInt(limit as string) : 10
        );

        res.json({
            success: true,
            data: patients,
        });
    } catch (err: any) {
        console.error("Error searching patients:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /patient/:id
 * ดึงข้อมูลคนไข้ตาม ID
 */
export const getPatientController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const patient = await getPatientById(id, clinicId);

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.json({
            success: true,
            data: patient,
        });
    } catch (err: any) {
        console.error("Error getting patient:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /patient
 * ดึงรายชื่อคนไข้ทั้งหมด
 */
export const getAllPatientsController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { page, limit, search, hasBalance } = req.query;

        const result = await getAllPatients(clinicId, {
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 50,
            search: search as string,
            hasBalance: hasBalance === "true",
        });

        res.json({
            success: true,
            ...result,
        });
    } catch (err: any) {
        console.error("Error getting all patients:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * PATCH /patient/:id
 * อัพเดทข้อมูลคนไข้
 */
export const updatePatientController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { fullname, nickname, tel, socialMedia, note } = req.body;

        const patient = await updatePatient(id, clinicId, {
            fullname,
            nickname,
            tel,
            socialMedia,
            note,
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "update",
            resource: "patient",
            resourceId: id,
            resourceName: patient.fullname,
            description: `แก้ไขข้อมูลคนไข้: ${patient.fullname}`,
            clinicId,
            clinicName,
            req,
        });

        res.json({
            success: true,
            data: patient,
        });
    } catch (err: any) {
        console.error("Error updating patient:", err);
        res.status(500).json({ message: err.message });
    }
};

// ============================================
// Balance / Wallet Operations
// ============================================

/**
 * POST /patient/:id/deposit
 * เพิ่มเงินมัดจำ
 */
export const addDepositController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { amount, description, appointmentId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Amount must be positive" });
        }

        const patient = await addDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: username,
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "create",
            resource: "patient_deposit",
            resourceId: id,
            resourceName: patient.fullname,
            description: `เพิ่มเงินมัดจำ ${amount.toLocaleString()} บาท ให้ ${patient.fullname}`,
            metadata: { amount, newBalance: patient.balance },
            clinicId,
            clinicName,
            req,
        });

        res.json({
            success: true,
            message: `เพิ่มเงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (err: any) {
        console.error("Error adding deposit:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /patient/:id/use-deposit
 * ใช้เงินมัดจำ
 */
export const useDepositController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { amount, description, appointmentId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Amount must be positive" });
        }

        const patient = await useDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: username,
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "update",
            resource: "patient_deposit",
            resourceId: id,
            resourceName: patient.fullname,
            description: `ใช้เงินมัดจำ ${amount.toLocaleString()} บาท ของ ${patient.fullname}`,
            metadata: { amount, newBalance: patient.balance },
            clinicId,
            clinicName,
            req,
        });

        res.json({
            success: true,
            message: `ใช้เงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (err: any) {
        console.error("Error using deposit:", err);

        if (err.message.includes("Insufficient balance")) {
            return res.status(400).json({
                message: "ยอดเงินมัดจำไม่เพียงพอ",
                error: err.message,
            });
        }

        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /patient/:id/refund
 * คืนเงินมัดจำ
 */
export const refundDepositController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { amount, description, appointmentId } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: "Amount must be positive" });
        }

        const patient = await refundDeposit(id, clinicId, amount, {
            description,
            appointmentId,
            createdBy: username,
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "update",
            resource: "patient_deposit",
            resourceId: id,
            resourceName: patient.fullname,
            description: `คืนเงินมัดจำ ${amount.toLocaleString()} บาท ให้ ${patient.fullname}`,
            metadata: { amount, newBalance: patient.balance },
            clinicId,
            clinicName,
            req,
        });

        res.json({
            success: true,
            message: `คืนเงินมัดจำ ${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (err: any) {
        console.error("Error refunding deposit:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * POST /patient/:id/adjust
 * ปรับยอดเงิน (admin)
 */
export const adjustBalanceController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const clinicName = req.user?.clinicName;
        const username = req.user?.username;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { amount, description } = req.body;

        if (amount === undefined || amount === 0) {
            return res.status(400).json({ message: "Amount is required and cannot be 0" });
        }

        if (!description) {
            return res.status(400).json({ message: "Description is required for adjustment" });
        }

        const patient = await adjustBalance(id, clinicId, amount, {
            description,
            createdBy: username,
        });

        if (!patient) {
            return res.status(404).json({ message: "Patient not found" });
        }

        await logActivity({
            userId: clinicId.toString(),
            userName: username || "unknown",
            action: "update",
            resource: "patient_balance",
            resourceId: id,
            resourceName: patient.fullname,
            description: `ปรับยอดเงิน ${amount > 0 ? "+" : ""}${amount.toLocaleString()} บาท ของ ${patient.fullname}`,
            metadata: { amount, description, newBalance: patient.balance },
            clinicId,
            clinicName,
            req,
        });

        res.json({
            success: true,
            message: `ปรับยอดเงิน ${amount > 0 ? "+" : ""}${amount.toLocaleString()} บาท สำเร็จ`,
            data: {
                patientId: patient._id,
                fullname: patient.fullname,
                balance: patient.balance,
            },
        });
    } catch (err: any) {
        console.error("Error adjusting balance:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /patient/:id/transactions
 * ดึงประวัติ transactions
 */
export const getTransactionsController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const { limit, skip } = req.query;

        const result = await getTransactionHistory(id, clinicId, {
            limit: limit ? parseInt(limit as string) : 50,
            skip: skip ? parseInt(skip as string) : 0,
        });

        if (!result) {
            return res.status(404).json({ message: "Patient not found" });
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (err: any) {
        console.error("Error getting transactions:", err);
        res.status(500).json({ message: err.message });
    }
};

/**
 * GET /patient/:id/appointments
 * ดึงประวัตินัดหมายของคนไข้
 */
export const getPatientAppointmentsController = async (req: AuthRequest, res: Response) => {
    try {
        const clinicId = req.user?.clinicId;
        const { id } = req.params;

        if (!clinicId) {
            return res.status(401).json({ message: "Unauthorized: clinicId not found" });
        }

        const appointments = await getPatientAppointments(id, clinicId);

        res.json({
            success: true,
            data: appointments,
        });
    } catch (err: any) {
        console.error("Error getting patient appointments:", err);
        res.status(500).json({ message: err.message });
    }
};
