import { Response } from "express";
import {
  createLead,
  findLeads,
  findLeadById,
  updateLeadById,
  deleteLeadById,
  getAppointmentHistory,
  getNextAppointments,
} from "../services/lead.service";
import { findOrCreatePatient, addDeposit, useDeposit } from "../services/patient.service";
import { logActivity } from "../services/activity.service";
import { AuthRequest } from "../middleware/auth.middlware";

export const createLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const branch = req.user?.branch;
    const username = req.user?.username;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    let body: any;

    if (req.file) {
      body = JSON.parse(req.body.data || "{}");
    } else {
      body = req.body;
    }

    let deposit: { amount: number; slipUrl?: string; slipUrls?: string[] } | undefined;

    if (req.file && body.depositAmount) {
      const slipUrl = `/uploads/slips/${req.file.filename}`;
      deposit = {
        amount: Number(body.depositAmount),
        slipUrl,
      };
    } else if (body.deposit && body.deposit.amount > 0) {
      deposit = body.deposit;
    }

    // ============================================
    // Find or Create Patient
    // ============================================
    const patientData = body.patient || {};
    const patient = await findOrCreatePatient(
      clinicId,
      {
        patientId: patientData.patientId,
        fullname: patientData.fullname,
        nickname: patientData.nickname,
        tel: patientData.tel,
        socialMedia: patientData.socialMedia,
      },
      username
    );

    // ============================================
    // สร้าง Lead พร้อม patientId
    // ============================================
    const leadData = {
      ...body,
      patientId: patient._id,
      patient: {
        fullname: patient.fullname,
        nickname: patient.nickname,
        tel: patient.tel || patientData.tel,
        socialMedia: patient.socialMedia || patientData.socialMedia,
      },
      clinic: {
        clinicId,
        name: clinicName || body.clinic?.name,
        branch: branch || body.clinic?.branch,
      },
      ...(deposit ? { deposit } : {}),
    };

    const lead = await createLead(leadData);

    // ============================================
    // เพิ่มเงินมัดจำเข้า Patient Wallet
    // ============================================
    if (deposit && deposit.amount > 0) {
      try {
        await addDeposit(patient._id.toString(), clinicId, deposit.amount, {
          description: `เพิ่มเงินมัดจำจาก Lead: ${patient.fullname}`,
          appointmentId: lead._id.toString(),
          createdBy: username,
        });
      } catch (err: any) {
        console.error("Failed to add deposit to patient wallet:", err.message);
      }
    }

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "create",
      resource: "lead",
      resourceId: lead._id.toString(),
      resourceName: patient.fullname,
      description: `สร้าง Lead: ${patient.fullname}`,
      metadata: {
        patientId: patient._id.toString(),
        status: lead.appointments?.status,
        interests: body.interests?.map((i: any) => i.name),
        depositAmount: deposit?.amount,
      },
      clinicId,
      clinicName,
      req,
    });

    res.status(201).json({ data: lead });
  } catch (error: any) {
    res.status(400).json({
      message: "Create lead failed",
      error: error.message,
    });
  }
};

export const getLeadsController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const year = req.query.year as string | undefined;

    const leads = await findLeads(clinicId, year);

    res.status(200).json({
      data: leads,
    });
  } catch (error) {
    res.status(500).json({
      message: "Get leads failed",
    });
  }
};

export const getLeadByIdController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const lead = await findLeadById(req.params.id, clinicId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ data: lead });
  } catch (error: any) {
    res.status(400).json({
      message: "Get lead failed",
      error: error.message,
    });
  }
};

export const updateLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const leadId = req.params.id;

    // ดึงข้อมูลเดิมก่อน update
    const oldLead = await findLeadById(leadId, clinicId);
    if (!oldLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    let updateData: any;

    if (req.file) {
      updateData = JSON.parse(req.body.data || "{}");

      const slipUrl = `/uploads/slips/${req.file.filename}`;
      updateData.deposit = {
        amount: Number(updateData.depositAmount || updateData.deposit?.amount),
        slipUrl,
      };
      delete updateData.depositAmount;
    } else {
      updateData = req.body;
    }

    // ============================================
    // ถ้ามีการเปลี่ยน patient → findOrCreate ใหม่
    // ============================================
    if (updateData.patient?.fullname) {
      const patientData = updateData.patient;
      const patient = await findOrCreatePatient(
        clinicId,
        {
          patientId: patientData.patientId || (oldLead as any).patientId,
          fullname: patientData.fullname,
          nickname: patientData.nickname,
          tel: patientData.tel,
          socialMedia: patientData.socialMedia,
        },
        username
      );

      updateData.patientId = patient._id;
      updateData.patient = {
        fullname: patient.fullname,
        nickname: patient.nickname,
        tel: patient.tel || patientData.tel,
        socialMedia: patient.socialMedia || patientData.socialMedia,
      };
    }

    // ============================================
    // จัดการเงินมัดจำใน Patient Wallet
    // ============================================
    const patientId = updateData.patientId || (oldLead as any).patientId;

    // กรณีเพิ่ม/แก้ไข deposit ใน lead (ตอนสร้างนัด)
    if (updateData.deposit && updateData.deposit.amount > 0) {
      const oldDepositAmount = (oldLead as any).deposit?.amount || 0;
      const newDepositAmount = updateData.deposit.amount;
      const diff = newDepositAmount - oldDepositAmount;

      if (diff > 0 && patientId) {
        try {
          await addDeposit(patientId.toString(), clinicId, diff, {
            description: `เพิ่มเงินมัดจำจาก Lead: ${updateData.patient?.fullname || (oldLead as any).patient?.fullname}`,
            appointmentId: leadId,
            createdBy: username,
          });
        } catch (err: any) {
          console.error("Failed to add deposit to patient wallet:", err.message);
        }
      }
    }

    // กรณีใช้เงินมัดจำ (จากฟอร์มมาตามนัด — คำนวณจาก procedures)
    const totalDepositUsed = Array.isArray(updateData.procedures)
      ? updateData.procedures.reduce((sum: number, p: any) => sum + (Number(p.depositUsed) || 0), 0)
      : 0;

    if (totalDepositUsed > 0 && patientId) {
      try {
        await useDeposit(patientId.toString(), clinicId, totalDepositUsed, {
          description: `ใช้เงินมัดจำสำหรับหัตถการ - ${updateData.patient?.fullname || (oldLead as any).patient?.fullname}`,
          appointmentId: leadId,
          createdBy: username,
        });
      } catch (err: any) {
        console.error("Failed to use deposit from patient wallet:", err.message);
        // ถ้า balance ไม่พอ ส่ง error กลับ
        if (err.message.includes("Insufficient balance")) {
          return res.status(400).json({
            message: "ยอดเงินมัดจำไม่เพียงพอ",
            error: err.message,
          });
        }
      }
    }

    const updatedLead = await updateLeadById(leadId, clinicId, updateData);

    if (!updatedLead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    // ตรวจสอบ status change
    if (updateData.appointments?.status &&
      oldLead.appointments?.status !== updateData.appointments.status) {
      changes.push({
        field: "status",
        oldValue: oldLead.appointments?.status,
        newValue: updateData.appointments.status,
      });
    }

    // ตรวจสอบ appointment date change
    if (updateData.appointments?.date) {
      changes.push({
        field: "appointmentDate",
        oldValue: oldLead.appointments?.date,
        newValue: updateData.appointments.date,
      });
    }

    // ตรวจสอบ patient name change
    if (updateData.patient?.fullname &&
      oldLead.patient?.fullname !== updateData.patient.fullname) {
      changes.push({
        field: "patient.fullname",
        oldValue: oldLead.patient?.fullname,
        newValue: updateData.patient.fullname,
      });
    }

    // ตรวจสอบ payment change
    if (updateData.payments?.amount !== undefined) {
      changes.push({
        field: "payments.amount",
        oldValue: oldLead.payments?.amount,
        newValue: updateData.payments.amount,
      });
    }

    // ตรวจสอบ deposit used change
    if (totalDepositUsed > 0) {
      changes.push({
        field: "depositUsed",
        oldValue: 0,
        newValue: totalDepositUsed,
      });
    }

    const isStatusChange = changes.some(c => c.field === "status");

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: isStatusChange ? "status_change" : "update",
      resource: "lead",
      resourceId: leadId,
      resourceName: updatedLead.patient?.fullname || oldLead.patient?.fullname,
      description: isStatusChange
        ? `เปลี่ยนสถานะ Lead: ${oldLead.patient?.fullname} (${oldLead.appointments?.status} → ${updateData.appointments?.status})`
        : `แก้ไข Lead: ${oldLead.patient?.fullname}`,
      changes: changes.length > 0 ? changes : undefined,
      metadata: totalDepositUsed > 0 ? { depositUsed: totalDepositUsed } : undefined,
      clinicId,
      clinicName,
      req,
    });

    res.status(200).json({ data: updatedLead });
  } catch (error: any) {
    res.status(400).json({
      message: "Update lead failed",
      error: error.message,
    });
  }
};

export const deleteLeadController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;
    const clinicName = req.user?.clinicName;
    const username = req.user?.username;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    // ดึงข้อมูลก่อนลบ
    const leadToDelete = await findLeadById(req.params.id, clinicId);

    const lead = await deleteLeadById(req.params.id, clinicId);

    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    await logActivity({
      userId: clinicId.toString(),
      userName: username || "unknown",
      action: "delete",
      resource: "lead",
      resourceId: req.params.id,
      resourceName: leadToDelete?.patient?.fullname,
      description: `ลบ Lead: ${leadToDelete?.patient?.fullname}`,
      metadata: {
        deletedData: {
          patient: leadToDelete?.patient,
          status: leadToDelete?.appointments?.status,
          interests: leadToDelete?.interests,
        },
      },
      clinicId,
      clinicName,
      req,
    });

    res.status(200).json({ message: "Lead deleted successfully" });
  } catch (error: any) {
    res.status(400).json({
      message: "Delete lead failed",
      error: error.message,
    });
  }
};

export const getLeadHistoryController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const result = await getAppointmentHistory(req.params.id, clinicId);

    if (!result) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.status(200).json({ data: result });
  } catch (error: any) {
    res.status(400).json({
      message: "Get lead history failed",
      error: error.message,
    });
  }
};

export const getNextLeadsController = async (req: AuthRequest, res: Response) => {
  try {
    const clinicId = req.user?.clinicId;

    if (!clinicId) {
      return res.status(401).json({
        message: "Unauthorized: clinicId not found",
      });
    }

    const nextAppointments = await getNextAppointments(req.params.id, clinicId);

    res.status(200).json({ data: nextAppointments });
  } catch (error: any) {
    res.status(400).json({
      message: "Get next leads failed",
      error: error.message,
    });
  }
};