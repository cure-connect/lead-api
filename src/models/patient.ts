import { Schema, model, Document } from "mongoose";

export interface PatientDocument extends Document {
    clinicId: number;
    fullname: string;
    nickname?: string;
    tel?: string;
    socialMedia?: string;

    interest?: string;           // หัตถการที่สนใจ (single)
    referralChannel?: string;    // ช่องทางที่รู้จัก
    createdBy?: string;          // แอดมินที่รับครั้งแรก
    branch?: string;             // สาขาที่เข้ามาครั้งแรก

    balance: number;

    transactions: Array<{
        type: "deposit" | "use" | "refund" | "adjust";
        amount: number;
        description: string;
        appointmentId?: Schema.Types.ObjectId;
        createdAt: Date;
        createdBy?: string;
    }>;

    note?: string;
    tags?: string[];

    createdAt: Date;
    updatedAt: Date;
}

const PatientSchema = new Schema(
    {
        clinicId: {
            type: Number,
            required: true,
            index: true,
        },
        fullname: {
            type: String,
            required: true,
            index: true,
        },
        nickname: {
            type: String,
            index: true,
        },
        tel: {
            type: String,
            index: true,
        },
        socialMedia: {
            type: String,
        },

        interest: {
            type: String,
        },
        referralChannel: {
            type: String,
        },
        createdBy: {
            type: String,
        },
        branch: {
            type: String,
        },

        balance: {
            type: Number,
            default: 0,
        },

        transactions: [
            {
                type: {
                    type: String,
                    enum: ["deposit", "use", "refund", "adjust"],
                    required: true,
                },
                amount: {
                    type: Number,
                    required: true,
                },
                description: {
                    type: String,
                    required: true,
                },
                appointmentId: {
                    type: Schema.Types.ObjectId,
                    ref: "Lead",
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                createdBy: String,
            },
        ],

        note: String,
        tags: [String],
    },
    {
        timestamps: true,
    }
);

// Compound index for search
PatientSchema.index({ clinicId: 1, fullname: "text", nickname: "text" });
PatientSchema.index({ clinicId: 1, tel: 1 });

// Virtual for formatted balance
PatientSchema.virtual("balanceFormatted").get(function () {
    return this.balance.toLocaleString();
});

export const PatientModel = model<PatientDocument>("Patient", PatientSchema);