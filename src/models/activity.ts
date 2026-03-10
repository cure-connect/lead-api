import { Schema, model, Document } from "mongoose";

export interface ActivityDocument extends Document {
    // Who
    userId: string;
    userName: string;

    // What
    action: "create" | "update" | "delete" | "view" | "login" | "logout" | "status_change" | "other";
    resource: "lead" | "appointment" | "patient" | "patient_deposit" | "patient_balance" | "user" | "clinic" | "procedure" | "settings" | "other";
    resourceId?: string;
    resourceName?: string;

    // Details
    description: string;
    changes?: {
        field: string;
        oldValue: any;
        newValue: any;
    }[];
    metadata?: Record<string, any>;

    // Where
    ipAddress?: string;
    userAgent?: string;

    // Context
    clinicId?: number;
    clinicName?: string;

    // Timestamps
    createdAt: Date;
}

const ActivitySchema = new Schema<ActivityDocument>(
    {
        // Who
        userId: { type: String, required: true, index: true },
        userName: { type: String, required: true },

        // What
        action: {
            type: String,
            required: true,
            enum: ["create", "update", "delete", "view", "login", "logout", "status_change", "other"],
            index: true,
        },
        resource: {
            type: String,
            required: true,
            enum: ["lead", "appointment", "patient", "patient_deposit", "patient_balance", "user", "clinic", "procedure", "settings", "other"],
            index: true,
        },
        resourceId: { type: String, index: true },
        resourceName: { type: String },

        // Details
        description: { type: String, required: true },
        changes: [
            {
                field: { type: String },
                oldValue: { type: Schema.Types.Mixed },
                newValue: { type: Schema.Types.Mixed },
            },
        ],
        metadata: { type: Schema.Types.Mixed },

        // Where
        ipAddress: { type: String },
        userAgent: { type: String },

        // Context
        clinicId: { type: Number, index: true },
        clinicName: { type: String },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

// Indexes
ActivitySchema.index({ createdAt: -1 });
ActivitySchema.index({ clinicId: 1, createdAt: -1 });
ActivitySchema.index({ userId: 1, createdAt: -1 });
ActivitySchema.index({ resource: 1, resourceId: 1 });

export const ActivityModel = model<ActivityDocument>("activities", ActivitySchema);