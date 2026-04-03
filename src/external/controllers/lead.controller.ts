import { Request, Response } from "express";
import { AppointmentModel } from "../../models/appointment";
import {
    createLead,
    updateLeadById,
    deleteLeadById,
    findLeadById,
    getAppointmentHistory,
} from "../../services/lead.service";
import { findOrCreatePatient, addDeposit, useDeposit } from "../../services/patient.service";
import { logActivity } from "../../services/activity.service";
import logger from "../../services/logger.service";

/**
 * Lead Controller for External API
 * Full CRUD + Business Logic (Patient, Wallet, Activity Log)
 */

/**
 * GET /
 * List leads with filters
 */
export const listLeads = async (req: Request, res: Response) => {
    try {
        const {
            status,
            clinic_id,
            start_date,
            end_date,
            search,
            page = "1",
            limit = "50",
            sort_by = "createdAt",
            sort_order = "desc",
        } = req.query;

        const query: any = {};

        if (status) query["appointments.status"] = status;
        if (clinic_id) query["clinic.clinicId"] = parseInt(clinic_id as string);

        if (start_date || end_date) {
            query.createdAt = {};
            if (start_date) query.createdAt.$gte = new Date(start_date as string);
            if (end_date) query.createdAt.$lte = new Date(end_date as string);
        }

        if (search) {
            query.$or = [
                { "patient.fullname": { $regex: search, $options: "i" } },
                { "patient.tel": { $regex: search, $options: "i" } },
                { "patient.nickname": { $regex: search, $options: "i" } },
            ];
        }

        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const skip = (pageNum - 1) * limitNum;
        const sort: any = { [sort_by as string]: sort_order === "asc" ? 1 : -1 };

        const [data, total] = await Promise.all([
            AppointmentModel.find(query)
                .sort(sort)
                .skip(skip)
                .limit(limitNum)
                .select("-__v")
                .lean(),
            AppointmentModel.countDocuments(query),
        ]);

        res.json({
            success: true,
            data,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasNext: pageNum * limitNum < total,
                hasPrev: pageNum > 1,
            },
        });
    } catch (error: any) {
        logger.error("External API: Failed to list leads", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve leads" },
        });
    }
};

/**
 * GET /:id
 * Get single lead
 */
export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const lead = await AppointmentModel.findById(id).select("-__v").lean();

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Lead not found" },
            });
        }

        res.json({ success: true, data: lead });
    } catch (error: any) {
        logger.error("External API: Failed to get lead", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve lead" },
        });
    }
};

/**
 * GET /patient/:phone
 * Get leads by patient phone
 */
export const getByPhone = async (req: Request, res: Response) => {
    try {
        const { phone } = req.params;
        const { clinic_id } = req.query;

        const query: any = { "patient.tel": phone };
        if (clinic_id) query["clinic.clinicId"] = parseInt(clinic_id as string);

        const leads = await AppointmentModel.find(query)
            .sort({ createdAt: -1 })
            .select("-__v")
            .lean();

        res.json({ success: true, data: leads, count: leads.length });
    } catch (error: any) {
        logger.error("External API: Failed to get leads by phone", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve leads" },
        });
    }
};

/**
 * GET /clinic/:clinicId
 * Get leads by clinic
 */
export const getByClinic = async (req: Request, res: Response) => {
    try {
        const { clinicId } = req.params;
        const { status, limit = "100" } = req.query;

        const query: any = { "clinic.clinicId": parseInt(clinicId) };
        if (status) query["appointments.status"] = status;

        const leads = await AppointmentModel.find(query)
            .sort({ createdAt: -1 })
            .limit(Math.min(parseInt(limit as string), 500))
            .select("-__v")
            .lean();

        res.json({ success: true, data: leads, count: leads.length });
    } catch (error: any) {
        logger.error("External API: Failed to get leads by clinic", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve leads" },
        });
    }
};

/**
 * GET /history/:id
 * Get appointment history chain (uses $graphLookup)
 */
export const getHistory = async (req: Request, res: Response) => {
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
        const result = await getAppointmentHistory(id, clinicId);

        if (!result) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Lead not found" },
            });
        }

        res.json({
            success: true,
            data: result,
        });
    } catch (error: any) {
        logger.error("External API: Failed to get history", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve history" },
        });
    }
};

/**
 * POST /
 * Create new lead (with Patient + Wallet + Activity Log)
 */
export const create = async (req: Request, res: Response) => {
    try {
        const {
            clinic,
            patient,
            appointments,
            interests,
            procedures,
            deposit,
            receiptUrl,
            receiptUrls,
            referralChannel,
            note,
            createdBy,
            previousAppointmentId,
        } = req.body;

        // === Validation ===
        if (!clinic?.clinicId || !clinic?.name || !clinic?.branch) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "clinic.clinicId, clinic.name, clinic.branch are required",
                },
            });
        }

        if (!patient?.fullname) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "patient.fullname is required" },
            });
        }

        if (!createdBy) {
            return res.status(400).json({
                success: false,
                error: { code: "VALIDATION_ERROR", message: "createdBy is required" },
            });
        }

        const clinicId = clinic.clinicId;
        const clinicName = clinic.name;

        // === Find or Create Patient ===
        const interestsList = Array.isArray(interests) ? interests : [];
        const patientDoc = await findOrCreatePatient(
            clinicId,
            {
                patientId: patient.patientId,
                fullname: patient.fullname,
                nickname: patient.nickname,
                tel: patient.tel,
                socialMedia: patient.socialMedia,
                interest: interestsList[0]?.name || undefined,
                referralChannel: referralChannel || undefined,
                branch: clinic.branch || undefined,
            },
            createdBy
        );

        // === Create Lead ===
        const leadData = {
            clinic,
            patientId: patientDoc._id.toString(),
            patient: {
                fullname: patientDoc.fullname,
                nickname: patientDoc.nickname,
                tel: patientDoc.tel || patient.tel,
                socialMedia: patientDoc.socialMedia || patient.socialMedia,
            },
            appointments: appointments || { status: "pending" },
            interests,
            procedures,
            deposit,
            receiptUrl,
            receiptUrls,
            referralChannel,
            note,
            createdBy,
            previousAppointmentId,
        };

        const lead = await createLead(leadData);

        // === Add Deposit to Patient Wallet ===
        if (deposit && deposit.amount > 0) {
            try {
                await addDeposit(patientDoc._id.toString(), clinicId, deposit.amount, {
                    description: `เพิ่มเงินมัดจำจาก Lead: ${patientDoc.fullname}`,
                    appointmentId: lead._id.toString(),
                    createdBy,
                });
            } catch (err: any) {
                logger.warn("External API: Failed to add deposit to wallet", {
                    error: err.message,
                    leadId: lead._id,
                    patientId: patientDoc._id.toString(),
                });
            }
        }

        // === Log Activity ===
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName: createdBy,
                action: "create",
                resource: "lead",
                resourceId: lead._id.toString(),
                resourceName: patientDoc.fullname,
                description: `สร้าง Lead: ${patientDoc.fullname} (via External API)`,
                metadata: {
                    patientId: patientDoc._id.toString(),
                    status: lead.appointments?.status,
                    interests: interests?.map((i: any) => i.name),
                    depositAmount: deposit?.amount,
                    source: "external_api",
                },
                clinicId,
                clinicName,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        logger.info("External API: Lead created", {
            leadId: lead._id,
            clinicId,
            patientId: patientDoc._id.toString(),
            apiKey: (req as any).apiKey?.name,
        });

        res.status(201).json({
            success: true,
            message: "Lead created successfully",
            data: lead,
        });
    } catch (error: any) {
        logger.error("External API: Failed to create lead", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create lead" },
        });
    }
};

/**
 * PUT /:id
 * Update lead (with Wallet + Activity Log)
 */
export const update = async (req: Request, res: Response) => {
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
        const updateData = req.body;
        const updatedBy = updateData.updatedBy || updateData.createdBy || "external_api";

        // === Check existing lead ===
        const oldLead = await findLeadById(id, clinicId);
        if (!oldLead) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Lead not found" },
            });
        }

        // === Handle Patient findOrCreate if patient data changed ===
        if (updateData.patient?.fullname) {
            const patientData = updateData.patient;
            const updateInterests = Array.isArray(updateData.interests) ? updateData.interests : [];
            const patientDoc = await findOrCreatePatient(
                clinicId,
                {
                    patientId: patientData.patientId || (oldLead as any).patientId,
                    fullname: patientData.fullname,
                    nickname: patientData.nickname,
                    tel: patientData.tel,
                    socialMedia: patientData.socialMedia,
                    interest: updateInterests[0]?.name || undefined,
                    referralChannel: updateData.referralChannel || undefined,
                    branch: updateData.clinic?.branch || undefined,
                },
                updatedBy
            );

            updateData.patientId = patientDoc._id.toString();
            updateData.patient = {
                fullname: patientDoc.fullname,
                nickname: patientDoc.nickname,
                tel: patientDoc.tel || patientData.tel,
                socialMedia: patientDoc.socialMedia || patientData.socialMedia,
            };
        }

        // === Handle Deposit (add to wallet) ===
        const patientId = updateData.patientId || (oldLead as any).patientId;

        if (updateData.deposit && updateData.deposit.amount > 0) {
            const oldDepositAmount = (oldLead as any).deposit?.amount || 0;
            const newDepositAmount = updateData.deposit.amount;
            const diff = newDepositAmount - oldDepositAmount;

            if (diff > 0 && patientId) {
                try {
                    await addDeposit(patientId.toString(), clinicId, diff, {
                        description: `เพิ่มเงินมัดจำจาก Lead: ${updateData.patient?.fullname || oldLead.patient?.fullname}`,
                        appointmentId: id,
                        createdBy: updatedBy,
                    });
                } catch (err: any) {
                    logger.warn("External API: Failed to add deposit", { error: err.message });
                }
            }
        }

        // === Handle useDeposit (from procedures) ===
        const totalDepositUsed = Array.isArray(updateData.procedures)
            ? updateData.procedures.reduce((sum: number, p: any) => sum + (Number(p.depositUsed) || 0), 0)
            : 0;

        if (totalDepositUsed > 0 && patientId) {
            try {
                await useDeposit(patientId.toString(), clinicId, totalDepositUsed, {
                    description: `ใช้เงินมัดจำสำหรับหัตถการ - ${updateData.patient?.fullname || oldLead.patient?.fullname}`,
                    appointmentId: id,
                    createdBy: updatedBy,
                });
            } catch (err: any) {
                if (err.message.includes("Insufficient balance")) {
                    return res.status(400).json({
                        success: false,
                        error: {
                            code: "INSUFFICIENT_BALANCE",
                            message: "ยอดเงินมัดจำไม่เพียงพอ",
                            details: err.message,
                        },
                    });
                }
                logger.warn("External API: Failed to use deposit", { error: err.message });
            }
        }

        // === Update Lead ===
        const lead = await updateLeadById(id, clinicId, updateData);

        if (!lead) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Lead not found or no changes" },
            });
        }

        // === Log Activity ===
        try {
            const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

            if (updateData.appointments?.status &&
                oldLead.appointments?.status !== updateData.appointments.status) {
                changes.push({
                    field: "status",
                    oldValue: oldLead.appointments?.status,
                    newValue: updateData.appointments.status,
                });
            }

            if (updateData.appointments?.date) {
                changes.push({
                    field: "appointmentDate",
                    oldValue: oldLead.appointments?.date,
                    newValue: updateData.appointments.date,
                });
            }

            if (updateData.payments?.amount !== undefined) {
                changes.push({
                    field: "payments.amount",
                    oldValue: oldLead.payments?.amount,
                    newValue: updateData.payments.amount,
                });
            }

            if (totalDepositUsed > 0) {
                changes.push({
                    field: "depositUsed",
                    oldValue: 0,
                    newValue: totalDepositUsed,
                });
            }

            const isStatusChange = changes.some((c) => c.field === "status");

            await logActivity({
                userId: clinicId.toString(),
                userName: updatedBy,
                action: isStatusChange ? "status_change" : "update",
                resource: "lead",
                resourceId: id,
                resourceName: lead.patient?.fullname || oldLead.patient?.fullname,
                description: isStatusChange
                    ? `เปลี่ยนสถานะ Lead: ${oldLead.patient?.fullname} (${oldLead.appointments?.status} → ${updateData.appointments?.status}) (via External API)`
                    : `แก้ไข Lead: ${oldLead.patient?.fullname} (via External API)`,
                changes: changes.length > 0 ? changes : undefined,
                metadata: {
                    ...(totalDepositUsed > 0 ? { depositUsed: totalDepositUsed } : {}),
                    source: "external_api",
                },
                clinicId,
                clinicName: (oldLead as any).clinic?.name,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        logger.info("External API: Lead updated", {
            leadId: id,
            clinicId,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Lead updated successfully",
            data: lead,
        });
    } catch (error: any) {
        logger.error("External API: Failed to update lead", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to update lead" },
        });
    }
};

/**
 * DELETE /:id
 * Delete lead (with Activity Log)
 */
export const remove = async (req: Request, res: Response) => {
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

        // Get lead data before deleting (for activity log)
        const leadToDelete = await findLeadById(id, clinicId);
        if (!leadToDelete) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Lead not found" },
            });
        }

        await deleteLeadById(id, clinicId);

        // === Log Activity ===
        try {
            await logActivity({
                userId: clinicId.toString(),
                userName: (req as any).apiKey?.name || "external_api",
                action: "delete",
                resource: "lead",
                resourceId: id,
                resourceName: leadToDelete.patient?.fullname,
                description: `ลบ Lead: ${leadToDelete.patient?.fullname} (via External API)`,
                metadata: {
                    deletedData: {
                        patient: leadToDelete.patient,
                        status: leadToDelete.appointments?.status,
                        interests: leadToDelete.interests,
                    },
                    source: "external_api",
                },
                clinicId,
                clinicName: (leadToDelete as any).clinic?.name,
                req,
            });
        } catch (err: any) {
            logger.warn("External API: Failed to log activity", { error: err.message });
        }

        logger.info("External API: Lead deleted", {
            leadId: id,
            clinicId,
            patientName: leadToDelete.patient?.fullname,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "Lead deleted successfully",
        });
    } catch (error: any) {
        logger.error("External API: Failed to delete lead", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to delete lead" },
        });
    }
};