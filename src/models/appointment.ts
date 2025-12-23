import { Schema, model, Document } from "mongoose";

export interface LeadDocument extends Document {
  clinic: {
    clinicId: string;
    name: string;
    branch: string;
  };
  patient: {
    name: string;
    tel: string;
    lineId?: string;
  };
  appointments: {
    status: "pending" | "scheduled";
    date?: Date;
  };
  interests?: string;
  referralChannel?: string;
  note?: string;
  createdBy: string;
}

const AppointmentSchema = new Schema<LeadDocument>(
  {
    clinic: {
      clinicId: { type: String, required: true },
      name: { type: String, required: true },
      branch: { type: String, required: true },
    },

    patient: {
      name: { type: String, required: true },
      tel: { type: String, required: true },
      lineId: { type: String },
    },

    appointments: {
      status: {
        type: String,
        enum: ["pending", "scheduled"],
        required: true,
      },
      date: {
        type: Date,
        required: function (this: any) {
          return this.appointments?.status === "scheduled";
        },
      },
    },

    interests: { type: String },
    referralChannel: { type: String },
    note: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const AppointmentModel = model<LeadDocument>(
  "Appointment",
  AppointmentSchema
);
