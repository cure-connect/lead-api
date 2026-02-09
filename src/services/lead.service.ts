import { AppointmentModel, LeadDocument } from "../models/appointment";

type AppointmentStatus = "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";

interface CreateLeadInput {
  clinic: {
    clinicId: number;
    name: string;
    branch: string;
  };
  patient: {
    name: string;
    tel: string;
    lineId?: string;
  };
  appointments: {
    status: AppointmentStatus;
    date?: Date | string;
  };
  interests?: Array<{ interestId?: string; name: string; price: string }>;
  procedures?: Array<{ name: string; price: string }>;
  deposit?: {
    amount: number;
    slipUrl: string;
  };
  referralChannel?: string;
  note?: string;
  createdBy: string;
  overrideCreatedAt?: Date | string;
}

export const createLead = async (
  data: CreateLeadInput
): Promise<LeadDocument> => {
  const isScheduled =
    data.appointments.status === "scheduled" &&
    !!data.appointments.date &&
    !isNaN(new Date(data.appointments.date).getTime());

  const leadData: any = {
    clinic: {
      clinicId: data.clinic.clinicId,
      name: data.clinic.name,
      branch: data.clinic.branch,
    },
    patient: {
      name: data.patient.name,
      tel: data.patient.tel,
      ...(data.patient.lineId ? { lineId: data.patient.lineId } : {}),
    },
    appointments: isScheduled
      ? { status: "scheduled", date: new Date(data.appointments.date!) }
      : { status: data.appointments.status || "pending" },
    interests: data.interests?.map((i) => ({
      interestId: i.interestId,
      name: i.name,
      price: i.price,
    })),

    procedures: data.procedures?.map((p) => ({
      name: p.name,
      price: p.price,
    })),

    ...(data.deposit?.amount && data.deposit?.slipUrl
      ? { deposit: { amount: data.deposit.amount, slipUrl: data.deposit.slipUrl } }
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

  return lead;
};

export const findLeads = (clinicId: number) => {
  return AppointmentModel.find({ "clinic.clinicId": clinicId }).sort({ createdAt: -1 });
};

export const findLeadById = (id: string, clinicId: number) => {
  return AppointmentModel.findOne({ _id: id, "clinic.clinicId": clinicId });
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
    if (body.patient.name !== undefined) $set["patient.name"] = body.patient.name;
    if (body.patient.tel !== undefined) $set["patient.tel"] = body.patient.tel;
    if (body.patient.lineId !== undefined) $set["patient.lineId"] = body.patient.lineId;
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
      if (body.deposit.slipUrl !== undefined) $set["deposit.slipUrl"] = body.deposit.slipUrl;
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

export const deleteLeadById = (id: string, clinicId: number) => {
  return AppointmentModel.findOneAndDelete({ _id: id, "clinic.clinicId": clinicId });
};