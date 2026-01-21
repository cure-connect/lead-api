import { Schema, model, Document, Model } from "mongoose";

export interface LeadDocument extends Document {
  leadId: number;
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
    status: "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";
    date?: Date;
  };
  interests?: {
    interestId: string;
    name: string;
    price: string;
  }[];
  payments?: {
    method: "cash" | "transfer" | "card" | "installment";
    amount: number;
    installment?: {
      months?: number;
      monthlyAmount?: number[];
      interestRate?: number;
    };
  };
  referralChannel?: string;
  note?: string;
  createdBy: string;
}

const AppointmentSchema = new Schema<LeadDocument>(
  {
    leadId: { type: Number, unique: true, index: true },

    clinic: {
      clinicId: { type: Number, required: true, index: true },
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
        enum: ["pending", "scheduled", "rescheduled", "cancelled", "arrived"],
        required: true,
      },
      date: {
        type: Date,
        required: function (this: any) {
          return this.appointments?.status === "scheduled";
        },
      },
    },

    interests: [
      {
        interestId: { type: String },
        name: { type: String, required: true },
        price: { type: String, required: true },
      },
    ],

    payments: {
      method: {
        type: String,
        enum: ["cash", "transfer", "card", "installment"],
        required: false,
      },
      amount: {
        type: Number,
        required: false,
      },
      installment: {
        months: Number,
        monthlyAmount: { type: [Number], default: [] },
        interestRate: Number,
      },
    },
    referralChannel: { type: String },
    note: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AppointmentSchema.pre("save", async function () {
  if (this.leadId) return;

  const Model = this.constructor as Model<any>;

  const last = await Model
    .findOne({}, { leadId: 1 })
    .sort({ leadId: -1 })
    .lean();

  this.leadId = last ? last.leadId + 1 : 1;
});

export const AppointmentModel = model<LeadDocument>(
  "Appointment",
  AppointmentSchema
);