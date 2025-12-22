import { Schema, model, Document, Types } from "mongoose";

export interface OptionItem {
  _id?: Types.ObjectId;
  name: string;
}

export interface OptionDocument extends Document {
  name: string;
  description?: string;
  clinicId: Types.ObjectId | string;
  options: OptionItem[];
}

const OptionItemSchema = new Schema<OptionItem>(
  {
    name: { type: String, required: true },
  },
  { _id: true }
);

const OptionSchema = new Schema<OptionDocument>(
  {
    name: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    clinicId: {
      type: Schema.Types.ObjectId,
      ref: "Clinic",
      required: true,
    },

    options: {
      type: [OptionItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export const OptionModel = model<OptionDocument>("Option", OptionSchema);
