import { Schema, model, Document } from "mongoose";
import bcrypt from "bcrypt";

export interface UserDocument extends Document {
  username: string | null;
  password: string | null;
  clinicId: number;
  clinicName: string;
  branch: string;
  expired?: Date;
  features?: {
    procedure?: {
      enabled?: Boolean;
      allowCustom?: Boolean
    },
  },
  lineGroupId?: string;
  lineAdminIds?: string[];
  createdAt: Date;
  updatedAt: Date;

  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<UserDocument>(
  {
    username: {
      type: String,
      unique: true,
      require: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      default: null,
      require: true
    },

    clinicId: {
      type: Number,
      unique: true,
      index: true,
    },

    clinicName: {
      type: String,
      required: true,
    },

    branch: {
      type: String,
      required: true,
    },

    expired: {
      type: Date,
      default: null,
      require: false
    },

    features: {
      procedure: {
        enabled: {
          type: Boolean,
          default: false,
        },
        allowCustom: {
          type: Boolean,
          default: true,
        },
      },
    },

    lineGroupId: {
      type: String,
      default: null,
    },
    lineAdminIds: [
      {
        type: String
      }
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

UserSchema.pre("save", async function () {
  if (this.clinicId) return;

  const Model = this.constructor as any;

  const last = await Model
    .findOne({}, { clinicId: 1 })
    .sort({ clinicId: -1 })
    .lean();

  this.clinicId = last ? last.clinicId + 1 : 1;
});

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  if (!this.password) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.pre("findOneAndUpdate", async function () {
  const update: any = this.getUpdate();

  if (update?.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
    this.setUpdate(update);
  }
});

UserSchema.methods.comparePassword = async function (
  candidatePassword: string
) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const UserModel = model<UserDocument>("users", UserSchema);