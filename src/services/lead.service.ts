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
  referralChannel?: string;
  note?: string;
  createdBy: string;
}

export const createLead = async (
  data: CreateLeadInput
): Promise<LeadDocument> => {
  const isScheduled =
    data.appointments.status === "scheduled" &&
    !!data.appointments.date &&
    !isNaN(new Date(data.appointments.date).getTime());

  const lead = await AppointmentModel.create({
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
      ? {
        status: "scheduled",
        date: new Date(data.appointments.date!),
      }
      : {
        status: data.appointments.status || "pending",
      },
    interests: data.interests?.map((i) => ({
      interestId: i.interestId,
      name: i.name,
      price: i.price,
    })),
    referralChannel: data.referralChannel,
    note: data.note,
    createdBy: data.createdBy,
  });

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

  if (body.clinic) {
    if (body.clinic.name !== undefined)
      $set["clinic.name"] = body.clinic.name;

    if (body.clinic.branch !== undefined)
      $set["clinic.branch"] = body.clinic.branch;
  }

  if (body.patient) {
    if (body.patient.name !== undefined)
      $set["patient.name"] = body.patient.name;

    if (body.patient.tel !== undefined)
      $set["patient.tel"] = body.patient.tel;

    if (body.patient.lineId !== undefined)
      $set["patient.lineId"] = body.patient.lineId;
  }

  if (body.appointments) {
    if (body.appointments.status !== undefined)
      $set["appointments.status"] = body.appointments.status;

    if (body.appointments.date !== undefined)
      $set["appointments.date"] = new Date(body.appointments.date);
  }

  if (body.interests !== undefined) {
    if (Array.isArray(body.interests)) {
      $set["interests"] = body.interests;
    }
  }

  if (body.payments) {
    if (body.payments.method !== undefined) $set["payments.method"] = body.payments.method;
    if (body.payments.amount !== undefined) $set["payments.amount"] = body.payments.amount;
    if (body.payments.installment) {
      if (body.payments.installment.months !== undefined)
        $set["payments.installment.months"] = body.payments.installment.months;
      if (body.payments.installment.monthlyAmount !== undefined)
        $set["payments.installment.monthlyAmount"] = body.payments.installment.monthlyAmount;
      if (body.payments.installment.interestRate !== undefined)
        $set["payments.installment.interestRate"] = body.payments.installment.interestRate;
    }
  }

  if (body.referralChannel !== undefined)
    $set["referralChannel"] = body.referralChannel;

  if (body.note !== undefined)
    $set["note"] = body.note;

  if (Object.keys($set).length === 0) {
    return null;
  }

  return AppointmentModel.findOneAndUpdate(
    { _id: id, "clinic.clinicId": clinicId },
    { $set },
    {
      new: true,
      runValidators: false,
    }
  );
};

export const deleteLeadById = (id: string, clinicId: number) => {
  return AppointmentModel.findOneAndDelete({ _id: id, "clinic.clinicId": clinicId });
};