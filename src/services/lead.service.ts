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
  const lead = await AppointmentModel.create({
    clinic: {
      clinicId: data.clinic.clinicId,
      name: data.clinic.name,
      branch: data.clinic.branch,
    },
    patient: {
      name: data.patient.name,
      tel: data.patient.tel,
      lineId: data.patient.lineId,
    },
    appointments: {
      status: data.appointments.status,
      date: new Date(data.appointments.date),
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

export const updateLeadById = (id: string, data: any) => {
  return AppointmentModel.findByIdAndUpdate(id, data, {
    new: true,
  });
};

export const deleteLeadById = (id: string) => {
  return AppointmentModel.findByIdAndDelete(id);
};
