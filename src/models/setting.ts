// import { Schema, model } from "mongoose";

// export type SettingType = "admin" | "branch" | "channel" | "interest";

// const SettingSchema = new Schema(
//   {
//     clinicId: {
//       type: Number,
//       required: true,
//       index: true
//     },
//     type: {
//       type: String,
//       enum: ["admin", "branch", "channel", "interest"],
//       required: true,
//       index: true
//     },
//     name: {
//       type: String,
//       required: true
//     },
//   },
//   {
//     timestamps: true
//   }
// );

// SettingSchema.index(
//   { clinicId: 1, type: 1, name: 1 },
//   { unique: true }
// );

// export const SettingModel = model("Setting", SettingSchema);

import { Schema, model } from "mongoose";

export type SettingType = "admin" | "branch" | "channel" | "interest" | "procedure";

const SettingSchema = new Schema(
  {
    clinicId: {
      type: Number,
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ["admin", "branch", "channel", "interest", "procedure"],
      required: true,
      index: true
    },
    name: {
      type: String,
      required: true
    },
  },
  {
    timestamps: true
  }
);

SettingSchema.index(
  { clinicId: 1, type: 1, name: 1 },
  { unique: true }
);

export const SettingModel = model("Setting", SettingSchema);