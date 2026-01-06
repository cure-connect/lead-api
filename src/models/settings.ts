import { Schema, model, Document, Model } from "mongoose";

interface BaseDocument extends Document {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InterestDocument extends BaseDocument {
  price: string;
}

function autoIncrement(schema: Schema) {
  schema.pre("save", async function () {
    if (this.id) return;

    const Model = this.constructor as Model<any>;

    const last = await Model
      .findOne({}, { id: 1 })
      .sort({ id: -1 })
      .lean();

    this.id = last ? last.id + 1 : 1;
  });
}

function createBaseSchema(extraFields: Record<string, any> = {}) {
  const schema = new Schema(
    {
      id: { type: Number, unique: true, index: true },
      name: { type: String, required: true, trim: true },
      ...extraFields,
    },
    {
      timestamps: true,
      versionKey: false,
    }
  );

  autoIncrement(schema);
  return schema;
}

const AdminSchema = createBaseSchema();

const BranchSchema = createBaseSchema();

const ChannelSchema = createBaseSchema();

const InterestSchema = createBaseSchema({
  price: { type: String, required: true, trim: true },
});

export const AdminModel = model<BaseDocument>("Admin", AdminSchema, "admins");

export const BranchModel = model<BaseDocument>("Branch", BranchSchema, "branches");

export const ChannelModel = model<BaseDocument>("Channel", ChannelSchema, "channels");

export const InterestModel = model<InterestDocument>("Interest", InterestSchema, "interests");
