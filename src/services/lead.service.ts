import { Types } from "mongoose";
import { AppointmentModel, LeadDocument } from "../models/appointment";

interface CreateLeadInput {
  clinic: {
    clinicId: string,
    name: string,
    branch: string,
  },
  patient: {
    name: string;
    tel: string;
    lineId?: string;
  };
  appointments: {
    status: string;
    date: Date | string;
  };
  interests?: Array<{ interestId: string; name: string; price: string }>;
  referralChannel?: string;
  note?: string;
  createdBy: string;
}

export const createLead = async (
  data: CreateLeadInput
): Promise<LeadDocument> => {
  console.log('data', data)
  const isScheduled =
    data.appointments.status === "scheduled" &&
    !!data.appointments.date &&
    !isNaN(new Date(data.appointments.date).getTime());

  const lead = await AppointmentModel.create({
    clinic: {
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
        date: new Date(data.appointments.date),
      }
      : {
        status: "pending",
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

  console.log(lead)
  return lead;
};


export const findLeads = (filter: Record<string, any> = {}) => {
  return AppointmentModel.find(filter).sort({ createdAt: -1 });
};

export const findLeadById = (id: string) => {
  return AppointmentModel.findById(id);
};

export const updateLeadById = async (
  id: string,
  body: any
) => {
  const $set: any = {};

  if (body.clinic) {
    if (body.clinic.clinicId !== undefined)
      $set["clinic.clinicId"] = body.clinic.clinicId;

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
    if (
      Array.isArray(body.interests) &&
      body.interests.every(
        (i: any) =>
          typeof i === "object" &&
          i.procedureId &&
          i.name &&
          typeof i.price === "string"
      )
    ) {
      $set["interests"] = body.interests;
    }
  }

  if(body.payments) {
    if(body.payments.method != undefined) $set["payments.method"] = body.payments.method
    if(body.payments.amount != undefined) $set["payments.amount"] = body.payments.amount
    if(body.payments.months != undefined) $set["payments.months"] = body.payments.months
  }

  if (body.referralChannel !== undefined)
    $set["referralChannel"] = body.referralChannel;

  if (body.note !== undefined)
    $set["note"] = body.note;

  if (Object.keys($set).length === 0) {
    return null;
  }

  return AppointmentModel.findByIdAndUpdate(
    id,
    { $set },
    {
      new: true,
      runValidators: false,
    }
  );
};



export const deleteLeadById = (id: string) => {
  return AppointmentModel.findByIdAndDelete(id);
};
