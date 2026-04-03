import { Schema, model, Document, Types } from "mongoose";

export interface LeadDocument extends Document {
  previousAppointmentId?: Types.ObjectId;
  nextAppointmentId?: Types.ObjectId;

  patientId?: Types.ObjectId;

  clinic: {
    clinicId: number;
    name: string;
    branch: string;
  };
  patient: {
    fullname: string;
    nickname?: string;
    tel: string;
    socialMedia?: string;
  };
  appointments: {
    status: "pending" | "scheduled" | "rescheduled" | "cancelled" | "arrived";
    date?: Date;
  };
  interests?: {
    interestId: string;
    name: string;
  }[];
  payments?: {
    method: "cash" | "transfer" | "card" | "free";
    amount: number;
    serviceCharge?: {
      rate: number;
      amount: number;
      netAmount: number;
    };
    commission?: {
      totalAmount: number;
      details: Array<{
        procedureName: string;
        baseAmount: number;
        rate: number;
        amount: number;
      }>;
    };
  };
  procedures?: {
    name: string;
    price: string;
    commissionRate?: number;
    depositUsed?: number;
  }[];
  deposit?: {
    amount: number;
    slipUrl?: string;
    slipUrls?: string[];
  };
  receiptUrl?: string;
  receiptUrls?: string[];

  referralChannel?: string;
  note?: string;
  arrivedNote?: string;
  createdBy: string;
  createdAt?: Date;
}

const AppointmentSchema = new Schema<LeadDocument>(
  {
    previousAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      index: true
    },
    nextAppointmentId: {
      type: Schema.Types.ObjectId,
      ref: "Appointment",
      index: true
    },

    patientId: {
      type: Schema.Types.ObjectId,
      ref: "Patient",
      index: true,
    },

    clinic: {
      clinicId: { type: Number, required: true, index: true },
      name: { type: String, required: true },
      branch: { type: String, required: true },
    },

    patient: {
      fullname: { type: String, required: true },
      nickname: { type: String },
      tel: { type: String },
      socialMedia: { type: String },
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
      },
    ],

    payments: {
      method: {
        type: String,
        enum: ["cash", "transfer", "card", "free"],
        required: false,
      },
      amount: {
        type: Number,
        required: false,
      },
      serviceCharge: {
        rate: { type: Number },
        amount: { type: Number },
        netAmount: { type: Number },
      },
      commission: {
        totalAmount: { type: Number },
        details: [
          {
            procedureName: { type: String },
            baseAmount: { type: Number },
            rate: { type: Number },
            amount: { type: Number },
          },
        ],
      },
    },

    procedures: [
      {
        name: { type: String, required: true },
        price: { type: String, required: true },
        commissionRate: { type: Number },
        depositUsed: { type: Number },
      },
    ],

    deposit: {
      amount: { type: Number },
      slipUrl: { type: String },
      slipUrls: [{ type: String }],
    },

    receiptUrl: { type: String },
    receiptUrls: [{ type: String }],

    referralChannel: { type: String },
    note: { type: String },
    arrivedNote: { type: String },
    createdBy: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

AppointmentSchema.index({ "clinic.clinicId": 1, patientId: 1 });

export const AppointmentModel = model<LeadDocument>(
  "Appointment",
  AppointmentSchema
);