import { Schema, model, Document, Types } from "mongoose";

export interface LeadDocument extends Document {
  previousAppointmentId?: Types.ObjectId;
  nextAppointmentId?: Types.ObjectId;

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
  }[];
  payments?: {
    method: "cash" | "transfer" | "card";
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
  }[];
  deposit?: {
    amount: number;
    slipUrl: string;
  };

  referralChannel?: string;
  note?: string;
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

    clinic: {
      clinicId: { type: Number, required: true, index: true },
      name: { type: String, required: true },
      branch: { type: String, required: true },
    },

    patient: {
      name: { type: String, required: true },
      tel: { type: String },
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
      },
    ],

    payments: {
      method: {
        type: String,
        enum: ["cash", "transfer", "card"],
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
      },
    ],

    deposit: {
      amount: { type: Number },
      slipUrl: { type: String },
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

export const AppointmentModel = model<LeadDocument>(
  "Appointment",
  AppointmentSchema
);