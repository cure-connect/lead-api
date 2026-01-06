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
  interests?: string;
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
          date: new Date(data.appointments.date),
        }
      : {
          status: "pending",
        },
    interests: data.interests,
    referralChannel: data.referralChannel,
    note: data.note,
    createdBy: data.createdBy,
  });

  return lead;
};


export const findLeads = (filter: Record<string, any> = {}) => {
  return AppointmentModel.find(filter).sort({ createdAt: -1 });
};

export const findLeadById = (id: string) => {
  return AppointmentModel.findById(id);
};

export const updateLeadById = async (id: string, data: Partial<LeadDocument>) => {
  const lead = await AppointmentModel.findById(id);
  if (!lead) return null;

  const { clinic, patient, appointments, ...otherData } = data;

  Object.assign(lead, otherData);

  if(clinic){
    lead.clinic = { ...lead.clinic, ...clinic}
  }

  if (patient) {
    lead.patient = { ...lead.patient, ...patient };
  }

  if (appointments) {
    lead.appointments = { 
       ...lead.appointments,
       ...appointments
    };
  }

  await lead.save();
  return lead;
};



export const deleteLeadById = (id: string) => {
  return AppointmentModel.findByIdAndDelete(id);
};
