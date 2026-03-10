import { PatientModel, PatientDocument } from "../models/patient";
import logger from "./logger.service";
import { AppointmentModel } from "../models/appointment";

/**
 * สร้างคนไข้ใหม่
 */
export const createPatient = async (
    clinicId: number,
    data: {
        fullname: string;
        nickname?: string;
        tel?: string;
        socialMedia?: string;
        note?: string;
    },
    createdBy?: string
): Promise<PatientDocument> => {
    try {
        const patient = await PatientModel.create({
            clinicId,
            fullname: data.fullname,
            nickname: data.nickname,
            tel: data.tel,
            socialMedia: data.socialMedia,
            note: data.note,
            balance: 0,
            transactions: [],
        });

        logger.info("Patient created", {
            patientId: patient._id,
            clinicId,
            fullname: data.fullname,
        });

        return patient;
    } catch (error: any) {
        logger.error("Failed to create patient", { error: error.message, clinicId });
        throw error;
    }
};

/**
 * ค้นหาคนไข้ตามชื่อ (สำหรับ autocomplete)
 */
export const searchPatients = async (
    clinicId: number,
    query: string,
    limit: number = 10
): Promise<PatientDocument[]> => {
    try {
        if (!query || query.length < 2) {
            return [];
        }

        const patients = await PatientModel.find({
            clinicId,
            $or: [
                { fullname: { $regex: query, $options: "i" } },
                { nickname: { $regex: query, $options: "i" } },
                { tel: { $regex: query, $options: "i" } },
            ],
        })
            .select("_id fullname nickname tel socialMedia balance")
            .limit(limit)
            .lean();

        return patients;
    } catch (error: any) {
        logger.error("Failed to search patients", { error: error.message, clinicId, query });
        throw error;
    }
};

/**
 * ดึงข้อมูลคนไข้ตาม ID
 */
export const getPatientById = async (
    patientId: string,
    clinicId?: number
): Promise<PatientDocument | null> => {
    try {
        const query: any = { _id: patientId };
        if (clinicId) {
            query.clinicId = clinicId;
        }

        return await PatientModel.findOne(query).lean();
    } catch (error: any) {
        logger.error("Failed to get patient", { error: error.message, patientId });
        throw error;
    }
};

/**
 * อัพเดทข้อมูลคนไข้
 */
export const updatePatient = async (
    patientId: string,
    clinicId: number,
    data: {
        fullname?: string;
        nickname?: string;
        tel?: string;
        socialMedia?: string;
        note?: string;
    }
): Promise<PatientDocument | null> => {
    try {
        const updateData: any = {};
        if (data.fullname) updateData.fullname = data.fullname;
        if (data.nickname !== undefined) updateData.nickname = data.nickname;
        if (data.tel !== undefined) updateData.tel = data.tel;
        if (data.socialMedia !== undefined) updateData.socialMedia = data.socialMedia;
        if (data.note !== undefined) updateData.note = data.note;

        const patient = await PatientModel.findOneAndUpdate(
            { _id: patientId, clinicId },
            { $set: updateData },
            { new: true }
        ).lean();

        if (patient) {
            logger.info("Patient updated", { patientId, clinicId });
        }

        return patient;
    } catch (error: any) {
        logger.error("Failed to update patient", { error: error.message, patientId });
        throw error;
    }
};

/**
 * ค้นหาหรือสร้างคนไข้
 * ถ้ามี patientId → ใช้ patient ที่มีอยู่
 * ถ้าไม่มี → สร้างใหม่จากข้อมูลที่ให้มา
 */
export const findOrCreatePatient = async (
    clinicId: number,
    data: {
        patientId?: string;
        fullname: string;
        nickname?: string;
        tel?: string;
        socialMedia?: string;
    },
    createdBy?: string
): Promise<PatientDocument> => {
    try {
        // ถ้ามี patientId → ดึงข้อมูลที่มีอยู่
        if (data.patientId) {
            const existing = await PatientModel.findOne({
                _id: data.patientId,
                clinicId,
            });

            if (existing) {
                // อัพเดทข้อมูลถ้ามีการเปลี่ยนแปลง
                if (data.tel && data.tel !== existing.tel) {
                    existing.tel = data.tel;
                }
                if (data.socialMedia && data.socialMedia !== existing.socialMedia) {
                    existing.socialMedia = data.socialMedia;
                }
                await existing.save();
                return existing;
            }
        }

        // ลองหาจากเบอร์โทร (unique per clinic)
        if (data.tel) {
            const byTel = await PatientModel.findOne({
                clinicId,
                tel: data.tel,
            });

            if (byTel) {
                // อัพเดทชื่อถ้าต่างกัน
                if (data.fullname && data.fullname !== byTel.fullname) {
                    byTel.fullname = data.fullname;
                }
                if (data.nickname && data.nickname !== byTel.nickname) {
                    byTel.nickname = data.nickname;
                }
                await byTel.save();
                return byTel;
            }
        }

        // สร้างใหม่
        const patient = await createPatient(clinicId, data, createdBy);
        return patient;
    } catch (error: any) {
        logger.error("Failed to find or create patient", { error: error.message, clinicId });
        throw error;
    }
};

// ============================================
// Balance / Wallet Operations
// ============================================

/**
 * เพิ่มเงินมัดจำ (Deposit)
 */
export const addDeposit = async (
    patientId: string,
    clinicId: number,
    amount: number,
    options: {
        description?: string;
        appointmentId?: string;
        createdBy?: string;
    } = {}
): Promise<PatientDocument | null> => {
    try {
        if (amount <= 0) {
            throw new Error("Amount must be positive");
        }

        const patient = await PatientModel.findOneAndUpdate(
            { _id: patientId, clinicId },
            {
                $inc: { balance: amount },
                $push: {
                    transactions: {
                        type: "deposit",
                        amount: amount,
                        description: options.description || `เพิ่มเงินมัดจำ ${amount.toLocaleString()} บาท`,
                        appointmentId: options.appointmentId,
                        createdAt: new Date(),
                        createdBy: options.createdBy,
                    },
                },
            },
            { new: true }
        );

        if (patient) {
            logger.info("Deposit added", {
                patientId,
                amount,
                newBalance: patient.balance,
            });
        }

        return patient;
    } catch (error: any) {
        logger.error("Failed to add deposit", { error: error.message, patientId, amount });
        throw error;
    }
};

/**
 * ใช้เงินมัดจำ (Use)
 */
export const useDeposit = async (
    patientId: string,
    clinicId: number,
    amount: number,
    options: {
        description?: string;
        appointmentId?: string;
        createdBy?: string;
    } = {}
): Promise<PatientDocument | null> => {
    try {
        if (amount <= 0) {
            throw new Error("Amount must be positive");
        }

        // ตรวจสอบ balance ก่อน
        const patient = await PatientModel.findOne({ _id: patientId, clinicId });
        if (!patient) {
            throw new Error("Patient not found");
        }

        if (patient.balance < amount) {
            throw new Error(`Insufficient balance. Available: ${patient.balance}, Required: ${amount}`);
        }

        const updated = await PatientModel.findOneAndUpdate(
            { _id: patientId, clinicId },
            {
                $inc: { balance: -amount },
                $push: {
                    transactions: {
                        type: "use",
                        amount: -amount,
                        description: options.description || `ใช้เงินมัดจำ ${amount.toLocaleString()} บาท`,
                        appointmentId: options.appointmentId,
                        createdAt: new Date(),
                        createdBy: options.createdBy,
                    },
                },
            },
            { new: true }
        );

        if (updated) {
            logger.info("Deposit used", {
                patientId,
                amount,
                newBalance: updated.balance,
            });
        }

        return updated;
    } catch (error: any) {
        logger.error("Failed to use deposit", { error: error.message, patientId, amount });
        throw error;
    }
};

/**
 * คืนเงินมัดจำ (Refund)
 */
export const refundDeposit = async (
    patientId: string,
    clinicId: number,
    amount: number,
    options: {
        description?: string;
        appointmentId?: string;
        createdBy?: string;
    } = {}
): Promise<PatientDocument | null> => {
    try {
        if (amount <= 0) {
            throw new Error("Amount must be positive");
        }

        const patient = await PatientModel.findOneAndUpdate(
            { _id: patientId, clinicId },
            {
                $inc: { balance: -amount },
                $push: {
                    transactions: {
                        type: "refund",
                        amount: -amount,
                        description: options.description || `คืนเงินมัดจำ ${amount.toLocaleString()} บาท`,
                        appointmentId: options.appointmentId,
                        createdAt: new Date(),
                        createdBy: options.createdBy,
                    },
                },
            },
            { new: true }
        );

        if (patient) {
            logger.info("Deposit refunded", {
                patientId,
                amount,
                newBalance: patient.balance,
            });
        }

        return patient;
    } catch (error: any) {
        logger.error("Failed to refund deposit", { error: error.message, patientId, amount });
        throw error;
    }
};

/**
 * ปรับยอดเงิน (Adjust - สำหรับ admin)
 */
export const adjustBalance = async (
    patientId: string,
    clinicId: number,
    amount: number, // บวก = เพิ่ม, ลบ = ลด
    options: {
        description: string;
        createdBy?: string;
    }
): Promise<PatientDocument | null> => {
    try {
        const patient = await PatientModel.findOneAndUpdate(
            { _id: patientId, clinicId },
            {
                $inc: { balance: amount },
                $push: {
                    transactions: {
                        type: "adjust",
                        amount: amount,
                        description: options.description,
                        createdAt: new Date(),
                        createdBy: options.createdBy,
                    },
                },
            },
            { new: true }
        );

        if (patient) {
            logger.info("Balance adjusted", {
                patientId,
                amount,
                newBalance: patient.balance,
            });
        }

        return patient;
    } catch (error: any) {
        logger.error("Failed to adjust balance", { error: error.message, patientId, amount });
        throw error;
    }
};

/**
 * ดึงประวัติ transactions
 */
export const getTransactionHistory = async (
    patientId: string,
    clinicId: number,
    options: {
        limit?: number;
        skip?: number;
    } = {}
) => {
    try {
        const patient = await PatientModel.findOne(
            { _id: patientId, clinicId },
            {
                transactions: {
                    $slice: [options.skip || 0, options.limit || 50],
                },
                balance: 1,
                fullname: 1,
            }
        ).lean();

        return patient;
    } catch (error: any) {
        logger.error("Failed to get transaction history", { error: error.message, patientId });
        throw error;
    }
};

/**
 * ดึงรายชื่อคนไข้ทั้งหมดของคลินิก
 */
export const getAllPatients = async (
    clinicId: number,
    options: {
        page?: number;
        limit?: number;
        search?: string;
        hasBalance?: boolean;
    } = {}
) => {
    try {
        const { page = 1, limit = 50, search, hasBalance } = options;
        const skip = (page - 1) * limit;

        const query: any = { clinicId };

        if (search) {
            query.$or = [
                { fullname: { $regex: search, $options: "i" } },
                { nickname: { $regex: search, $options: "i" } },
                { tel: { $regex: search, $options: "i" } },
            ];
        }

        if (hasBalance) {
            query.balance = { $gt: 0 };
        }

        const [patients, total] = await Promise.all([
            PatientModel.find(query)
                .select("_id fullname nickname tel socialMedia balance createdAt")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            PatientModel.countDocuments(query),
        ]);

        return {
            data: patients,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error: any) {
        logger.error("Failed to get all patients", { error: error.message, clinicId });
        throw error;
    }
};

/**
 * ดึงประวัตินัดหมาย (leads) ทั้งหมดของคนไข้
 */
export const getPatientAppointments = async (
    patientId: string,
    clinicId: number,
) => {
    try {
        const appointments = await AppointmentModel.find({
            patientId,
            "clinic.clinicId": clinicId,
        })
            .sort({ createdAt: -1 })
            .lean();

        return appointments;
    } catch (error: any) {
        logger.error("Failed to get patient appointments", { error: error.message, patientId });
        throw error;
    }
};