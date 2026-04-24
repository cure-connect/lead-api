import { AppointmentModel, LeadDocument } from "../models/appointment";
import { PatientModel } from "../models/patient";
import { Types } from "mongoose";
import logger from "./logger.service";

type AppointmentStatus = "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";

interface CreateLeadInput {
  patientId?: string;
  clinic: {
    clinicId: number;
    name: string;
    branch: string;
  };
  patient: {
    fullname: string;
    nickname?: string;
    tel?: string;
    socialMedia?: string;
  };
  appointments: {
    status: AppointmentStatus;
    date?: Date | string;
  };
  interests?: Array<{ interestId?: string; name: string }>;
  procedures?: Array<{ name: string; price: string }>;
  deposit?: {
    amount: number;
    slipUrl?: string;
    slipUrls?: string[];
  };
  receiptUrl?: string;
  receiptUrls?: string[];
  referralChannel?: string;
  note?: string;
  createdBy: string;
  overrideCreatedAt?: Date | string;
  previousAppointmentId?: string;
}

// ============================================
// Helper: override embedded patient ด้วยข้อมูลจาก populated patientId
// ============================================
const populatePatientFields = "fullname nickname tel socialMedia";

const mergePatientData = (doc: any) => {
  if (doc.patientId && typeof doc.patientId === "object" && doc.patientId.fullname) {
    doc.patient = {
      fullname: doc.patientId.fullname,
      nickname: doc.patientId.nickname,
      tel: doc.patientId.tel,
      socialMedia: doc.patientId.socialMedia,
    };
    // เก็บ patientId กลับเป็น ObjectId เหมือนเดิม
    doc.patientId = doc.patientId._id;
  }
  return doc;
};

// ============================================
// Create Lead (ไม่เปลี่ยน)
// ============================================
export const createLead = async (
  data: CreateLeadInput
): Promise<LeadDocument> => {
  try {
    const isScheduled =
      data.appointments.status === "scheduled" &&
      !!data.appointments.date &&
      !isNaN(new Date(data.appointments.date).getTime());

    let depositData: any = undefined;
    if (data.deposit?.amount) {
      depositData = {
        amount: data.deposit.amount,
      };

      if (data.deposit.slipUrls && data.deposit.slipUrls.length > 0) {
        depositData.slipUrls = data.deposit.slipUrls;
      } else if (data.deposit.slipUrl) {
        depositData.slipUrls = [data.deposit.slipUrl];
      }
    }

    const leadData: any = {
      ...(data.previousAppointmentId
        ? { previousAppointmentId: new Types.ObjectId(data.previousAppointmentId) }
        : {}),

      ...(data.patientId
        ? { patientId: new Types.ObjectId(data.patientId.toString()) }
        : {}),

      patient: {
        fullname: data.patient.fullname,
        tel: data.patient.tel || "",
        ...(data.patient.nickname ? { nickname: data.patient.nickname } : {}),
        ...(data.patient.socialMedia ? { socialMedia: data.patient.socialMedia } : {}),
      },

      clinic: {
        clinicId: data.clinic.clinicId,
        name: data.clinic.name,
        branch: data.clinic.branch,
      },
      appointments: isScheduled
        ? { status: "scheduled", date: new Date(data.appointments.date!) }
        : { status: data.appointments.status || "pending" },
      interests: data.interests?.map((i) => ({
        interestId: i.interestId,
        name: i.name,
      })),

      procedures: data.procedures?.map((p) => ({
        name: p.name,
        price: p.price,
      })),

      ...(depositData ? { deposit: depositData } : {}),

      ...(data.receiptUrls && data.receiptUrls.length > 0
        ? { receiptUrls: data.receiptUrls }
        : data.receiptUrl
          ? { receiptUrls: [data.receiptUrl] }
          : {}),

      referralChannel: data.referralChannel,
      note: data.note,
      createdBy: data.createdBy,
    };

    if (data.overrideCreatedAt) {
      leadData.createdAt = new Date(data.overrideCreatedAt);
    }

    const lead = new AppointmentModel(leadData);
    await lead.save();

    if (data.previousAppointmentId) {
      await AppointmentModel.findByIdAndUpdate(
        data.previousAppointmentId,
        { $set: { nextAppointmentId: lead._id } }
      );
    }

    logger.debug("Lead created", {
      leadId: lead._id,
      clinicId: data.clinic.clinicId,
      patientName: data.patient.fullname,
    });

    return lead;
  } catch (error: any) {
    logger.error("Failed to create lead", {
      error: error.message,
      clinicId: data.clinic.clinicId,
      patientName: data.patient.fullname,
    });
    throw error;
  }
};

// ============================================
// Find Leads — populate patientId แล้ว merge
// ============================================
export const findLeads = async (clinicId: number, year?: string) => {
  try {
    const query: any = { "clinic.clinicId": clinicId };

    if (year) {
      const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
      const endDate = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);

      query.$or = [
        { createdAt: { $gte: startDate, $lt: endDate } },
        { "appointments.date": { $gte: startDate, $lt: endDate } },
      ];
    }

    const leads = await AppointmentModel.find(query)
      .populate("patientId", populatePatientFields)
      .sort({ createdAt: -1 })
      .lean();

    const result = leads.map(mergePatientData);

    logger.debug("Leads fetched", { clinicId, year, count: result.length });

    return result;
  } catch (error: any) {
    logger.error("Failed to fetch leads", { error: error.message, clinicId, year });
    throw error;
  }
};

// ============================================
// Find Lead By ID — populate patientId แล้ว merge
// ============================================
export const findLeadById = async (id: string, clinicId: number) => {
  try {
    const lead = await AppointmentModel.findOne({ _id: id, "clinic.clinicId": clinicId })
      .populate("patientId", populatePatientFields)
      .lean();

    if (!lead) return null;

    return mergePatientData(lead);
  } catch (error: any) {
    logger.error("Failed to find lead by id", { error: error.message, leadId: id, clinicId });
    throw error;
  }
};

// ============================================
// Get Appointment History
// $graphLookup ไม่รองรับ populate → batch lookup patientIds เอง
// ============================================
export const getAppointmentHistory = async (
  appointmentId: string,
  clinicId: number
) => {
  try {
    const result = await AppointmentModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(appointmentId),
          "clinic.clinicId": clinicId,
        },
      },
      {
        $graphLookup: {
          from: "appointments",
          startWith: "$previousAppointmentId",
          connectFromField: "previousAppointmentId",
          connectToField: "_id",
          as: "history",
          maxDepth: 100,
          restrictSearchWithMatch: { "clinic.clinicId": clinicId },
        },
      },
    ]);

    if (result.length === 0) {
      return null;
    }

    const current = result[0];
    let history: any[] = current.history || [];

    // รวม patientIds ทั้งหมด (current + history) แล้ว batch lookup ทีเดียว
    const allDocs = [current, ...history];
    const patientIds = [
      ...new Set(
        allDocs
          .filter((d) => d.patientId)
          .map((d) => d.patientId.toString())
      ),
    ];

    let patientMap: Record<string, any> = {};
    if (patientIds.length > 0) {
      const patients = await PatientModel.find({
        _id: { $in: patientIds.map((pid) => new Types.ObjectId(pid)) },
      })
        .select(populatePatientFields)
        .lean();

      patientMap = patients.reduce((map: Record<string, any>, p: any) => {
        map[p._id.toString()] = {
          fullname: p.fullname,
          nickname: p.nickname,
          tel: p.tel,
          socialMedia: p.socialMedia,
        };
        return map;
      }, {});
    }

    // ถ้ามีใน patientMap ใช้ข้อมูลล่าสุด ไม่งั้น fallback embedded เดิม
    const resolvePatient = (doc: any) => {
      if (doc.patientId && patientMap[doc.patientId.toString()]) {
        return patientMap[doc.patientId.toString()];
      }
      return doc.patient;
    };

    history.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    logger.debug("Appointment history fetched", {
      appointmentId,
      clinicId,
      historyCount: history.length,
    });

    return {
      current: {
        _id: current._id,
        patient: resolvePatient(current),
        clinic: current.clinic,
        appointments: current.appointments,
        procedures: current.procedures,
        payments: current.payments,
        interests: current.interests,
        deposit: current.deposit,
        receiptUrl: current.receiptUrl,
        receiptUrls: current.receiptUrls,
        referralChannel: current.referralChannel,
        note: current.note,
        arrivedNote: current.arrivedNote,
        rescheduledNote: current.rescheduledNote,
        cancelledNote: current.cancelledNote,
        createdBy: current.createdBy,
        createdAt: current.createdAt,
        previousAppointmentId: current.previousAppointmentId,
      },
      history: history.map((h: any) => ({
        _id: h._id,
        patient: resolvePatient(h),
        clinic: h.clinic,
        appointments: h.appointments,
        procedures: h.procedures,
        payments: h.payments,
        interests: h.interests,
        deposit: h.deposit,
        receiptUrl: h.receiptUrl,
        receiptUrls: h.receiptUrls,
        referralChannel: h.referralChannel,
        note: h.note,
        arrivedNote: h.arrivedNote,
        rescheduledNote: h.rescheduledNote,
        cancelledNote: h.cancelledNote,
        createdBy: h.createdBy,
        createdAt: h.createdAt,
        previousAppointmentId: h.previousAppointmentId,
      })),
      totalVisits: history.length + 1,
    };
  } catch (error: any) {
    logger.error("Failed to get appointment history", {
      error: error.message,
      appointmentId,
      clinicId,
    });
    throw error;
  }
};

// ============================================
// Get Next Appointments — populate patientId แล้ว merge
// ============================================
export const getNextAppointments = async (
  appointmentId: string,
  clinicId: number
) => {
  try {
    const docs = await AppointmentModel.find({
      previousAppointmentId: new Types.ObjectId(appointmentId),
      "clinic.clinicId": clinicId,
    })
      .populate("patientId", populatePatientFields)
      .sort({ createdAt: 1 })
      .lean();

    return docs.map(mergePatientData);
  } catch (error: any) {
    logger.error("Failed to get next appointments", {
      error: error.message,
      appointmentId,
      clinicId,
    });
    throw error;
  }
};

// ============================================
// Update Lead (ไม่เปลี่ยน)
// ============================================
export const updateLeadById = async (
  id: string,
  clinicId: number,
  body: any
) => {
  try {
    const $set: any = {};
    const $unset: any = {};

    if (body.patientId) {
      $set["patientId"] = new Types.ObjectId(body.patientId.toString());
    }

    if (body.clinic) {
      if (body.clinic.name !== undefined) $set["clinic.name"] = body.clinic.name;
      if (body.clinic.branch !== undefined) $set["clinic.branch"] = body.clinic.branch;
    }

    if (body.patient) {
      if (body.patient.fullname !== undefined) $set["patient.fullname"] = body.patient.fullname;
      if (body.patient.nickname !== undefined) $set["patient.nickname"] = body.patient.nickname;
      if (body.patient.tel !== undefined) $set["patient.tel"] = body.patient.tel;
      if (body.patient.socialMedia !== undefined) $set["patient.socialMedia"] = body.patient.socialMedia;
    }

    if (body.appointments) {
      if (body.appointments.status !== undefined)
        $set["appointments.status"] = body.appointments.status;
      if (body.appointments.date !== undefined)
        $set["appointments.date"] = new Date(body.appointments.date);
    }

    if (body.interests !== undefined) {
      if (Array.isArray(body.interests)) $set["interests"] = body.interests;
    }

    if (body.procedures !== undefined) {
      if (Array.isArray(body.procedures)) $set["procedures"] = body.procedures;
    }

    if (body.payments) {
      if (body.payments.method !== undefined) $set["payments.method"] = body.payments.method;
      if (body.payments.amount !== undefined) $set["payments.amount"] = body.payments.amount;
      if (body.payments.serviceCharge) {
        if (body.payments.serviceCharge.rate !== undefined)
          $set["payments.serviceCharge.rate"] = body.payments.serviceCharge.rate;
        if (body.payments.serviceCharge.amount !== undefined)
          $set["payments.serviceCharge.amount"] = body.payments.serviceCharge.amount;
        if (body.payments.serviceCharge.netAmount !== undefined)
          $set["payments.serviceCharge.netAmount"] = body.payments.serviceCharge.netAmount;
      }
      if (body.payments.commission !== undefined) {
        if (body.payments.commission === null) {
          $unset["payments.commission"] = 1;
        } else {
          $set["payments.commission"] = body.payments.commission;
        }
      }
    }

    if (body.deposit !== undefined) {
      if (body.deposit === null) {
        $unset["deposit"] = 1;
      } else {
        if (body.deposit.amount !== undefined) $set["deposit.amount"] = body.deposit.amount;

        if (body.deposit.slipUrls !== undefined) {
          $set["deposit.slipUrls"] = body.deposit.slipUrls;
        } else if (body.deposit.slipUrl !== undefined) {
          $set["deposit.slipUrls"] = [body.deposit.slipUrl];
        }
      }
    }

    if (body.receiptUrls !== undefined) {
      if (body.receiptUrls === null || body.receiptUrls.length === 0) {
        $unset["receiptUrls"] = 1;
      } else {
        $set["receiptUrls"] = body.receiptUrls;
      }
    } else if (body.receiptUrl !== undefined) {
      if (body.receiptUrl === null) {
        $unset["receiptUrls"] = 1;
      } else {
        $set["receiptUrls"] = [body.receiptUrl];
      }
    }

    if (body.referralChannel !== undefined) $set["referralChannel"] = body.referralChannel;
    if (body.note !== undefined) $set["note"] = body.note;
    if (body.arrivedNote !== undefined) $set["arrivedNote"] = body.arrivedNote;
    if (body.rescheduledNote !== undefined) $set["rescheduledNote"] = body.rescheduledNote;
    if (body.cancelledNote !== undefined) $set["cancelledNote"] = body.cancelledNote;

    const update: any = {};
    if (Object.keys($set).length > 0) update.$set = $set;
    if (Object.keys($unset).length > 0) update.$unset = $unset;

    if (Object.keys(update).length === 0) return null;

    const lead = await AppointmentModel.findOneAndUpdate(
      { _id: id, "clinic.clinicId": clinicId },
      update,
      { new: true, runValidators: false }
    );

    if (lead) {
      logger.debug("Lead updated", { leadId: id, clinicId });
    }

    return lead;
  } catch (error: any) {
    logger.error("Failed to update lead", { error: error.message, leadId: id, clinicId });
    throw error;
  }
};

// ============================================
// Delete Lead (ไม่เปลี่ยน)
// ============================================
export const deleteLeadById = async (id: string, clinicId: number) => {
  try {
    const leadToDelete = await AppointmentModel.findOne({ _id: id, "clinic.clinicId": clinicId });

    if (!leadToDelete) return null;

    if (leadToDelete.previousAppointmentId) {
      await AppointmentModel.findByIdAndUpdate(
        leadToDelete.previousAppointmentId,
        { $unset: { nextAppointmentId: 1 } }
      );
    }

    if (leadToDelete.nextAppointmentId) {
      await AppointmentModel.findByIdAndUpdate(
        leadToDelete.nextAppointmentId,
        { $unset: { previousAppointmentId: 1 } }
      );
    }

    const result = await AppointmentModel.findOneAndDelete({ _id: id, "clinic.clinicId": clinicId });

    logger.info("Lead deleted", {
      leadId: id,
      clinicId,
      patientName: leadToDelete.patient?.fullname,
    });

    return result;
  } catch (error: any) {
    logger.error("Failed to delete lead", { error: error.message, leadId: id, clinicId });
    throw error;
  }
};