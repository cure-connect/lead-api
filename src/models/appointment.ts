import { Schema, model, Document, Model } from "mongoose";

export interface LeadDocument extends Document {
  clinicId: number;
  clinic: {
    name: string;
    branch: string;
  };
  patient: {
    name: string;
    tel: string;
    lineId?: string;
  };
  appointments: {
    status: "pending" | "scheduled" | "rescheduled" | "cancelled";
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
      monthlyAmount?: number;
      interestRate?: number;
    };
  };
  referralChannel?: string;
  note?: string;
  createdBy: string;
}

const AppointmentSchema = new Schema<LeadDocument>(
  {
    clinicId: { type: Number, unique: true ,index: true },

    clinic: {
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
        monthlyAmount: Number,
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
  if (this.clinicId) return;

  const Model = this.constructor as Model<any>;

  const last = await Model
    .findOne({}, { clinicId: 1 })
    .sort({ clinicId: -1 })
    .lean();

  this.clinicId = last ? last.clinicId + 1 : 1;
});



export const AppointmentModel = model<LeadDocument>(
  "Appointment",
  AppointmentSchema
);
