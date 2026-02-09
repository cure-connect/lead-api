import { Schema, model, Document } from "mongoose";

export interface ClinicDocument extends Document {
  username: string;
  password: string;
  name: string;
  branch: string[];
  expired: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ClinicSchema = new Schema<ClinicDocument>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },

    password: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      required: true,
    },

    branch: {
      type: [String],
      default: [],
    },

    expired: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const ClinicModel = model<ClinicDocument>("Clinic", ClinicSchema);
