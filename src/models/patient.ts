import { Schema, model, Document } from "mongoose";

export interface PatientDocument extends Document {
    clinicId: number;
    fullname: string;
    nickname?: string;
    tel?: string;
    socialMedia?: string;

    // Wallet / Balance
    balance: number;  // ยอดเงินมัดจำคงเหลือ

    // Transaction History
    transactions: Array<{
        type: "deposit" | "use" | "refund" | "adjust";
        amount: number;
        description: string;
        appointmentId?: Schema.Types.ObjectId;
        createdAt: Date;
        createdBy?: string;
    }>;

    // Metadata
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

        // Wallet
        balance: {
            type: Number,
            default: 0,
        },

        // Transaction History
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