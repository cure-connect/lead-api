import { AppointmentModel, LeadDocument } from "../models/appointment";
import { Types } from "mongoose";

type AppointmentStatus = "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";

interface CreateLeadInput {
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

export const createLead = async (
  data: CreateLeadInput
): Promise<LeadDocument> => {
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

  return lead;
};

export const findLeads = (clinicId: number, year?: string) => {
  const query: any = { "clinic.clinicId": clinicId };

  if (year) {
    const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
    const endDate = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);

    query.$or = [
      { createdAt: { $gte: startDate, $lt: endDate } },
      { "appointments.date": { $gte: startDate, $lt: endDate } }
    ];
  }

  return AppointmentModel.find(query).sort({ createdAt: -1 });
};

export const findLeadById = (id: string, clinicId: number) => {
  return AppointmentModel.findOne({ _id: id, "clinic.clinicId": clinicId });
};

export const getAppointmentHistory = async (
  appointmentId: string,
  clinicId: number
) => {
  const result = await AppointmentModel.aggregate([
    {
      $match: {
        _id: new Types.ObjectId(appointmentId),
        "clinic.clinicId": clinicId
      }
    },

    {
      $graphLookup: {
        from: "appointments",
        startWith: "$previousAppointmentId",
        connectFromField: "previousAppointmentId",
        connectToField: "_id",
        as: "history",
        maxDepth: 100,
        restrictSearchWithMatch: { "clinic.clinicId": clinicId }
      }
    }
  ]);

  if (result.length === 0) {
    return null;
  }

  const current = result[0];
  const history = current.history || [];

  history.sort((a: any, b: any) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return {
    current: {
      _id: current._id,
      patient: current.patient,
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
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      previousAppointmentId: current.previousAppointmentId,
    },
    history: history.map((h: any) => ({
      _id: h._id,
      patient: h.patient,
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
      createdBy: h.createdBy,
      createdAt: h.createdAt,
      previousAppointmentId: h.previousAppointmentId,
    })),
    totalVisits: history.length + 1
  };
};

export const getNextAppointments = async (
  appointmentId: string,
  clinicId: number
) => {
  return AppointmentModel.find({
    previousAppointmentId: new Types.ObjectId(appointmentId),
    "clinic.clinicId": clinicId
  }).sort({ createdAt: 1 });
};

export const updateLeadById = async (
  id: string,
  clinicId: number,
  body: any
) => {
  const $set: any = {};
  const $unset: any = {};

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

  const update: any = {};
  if (Object.keys($set).length > 0) update.$set = $set;
  if (Object.keys($unset).length > 0) update.$unset = $unset;

  if (Object.keys(update).length === 0) return null;

  return AppointmentModel.findOneAndUpdate(
    { _id: id, "clinic.clinicId": clinicId },
    update,
    { new: true, runValidators: false }
  );
};

export const deleteLeadById = async (id: string, clinicId: number) => {
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

  return AppointmentModel.findOneAndDelete({ _id: id, "clinic.clinicId": clinicId });
};