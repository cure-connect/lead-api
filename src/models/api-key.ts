import mongoose, { Schema, Document, Model } from "mongoose";
import crypto from "crypto";

// ============================================
// Interface
// ============================================

export interface IApiKey {
    name: string;
    keyHash: string;
    keyPrefix: string;
    permissions: string[];
    rateLimit: number;
    isActive: boolean;
    expiresAt?: Date;
    lastUsedAt?: Date;
    usageCount: number;
    contactEmail?: string;
    metadata?: {
        contactName?: string;
        company?: string;
        description?: string;
    };
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ApiKeyDocument extends IApiKey, Document { }

interface ApiKeyModel extends Model<ApiKeyDocument> {
    generateKey(prefix?: string): { apiKey: string; keyHash: string; keyPrefix: string };
    hashKey(apiKey: string): string;
}

// ============================================
// Schema
// ============================================

const ApiKeySchema = new Schema<ApiKeyDocument, ApiKeyModel>(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        keyHash: {
            type: String,
            required: true,
            unique: true,
        },
        keyPrefix: {
            type: String,
            required: true,
        },
        permissions: {
            type: [String],
            default: ["read:leads"],
            enum: [
                "*",              // all permissions
                "read:leads",
                "write:leads",
                "read:activity",
                "write:activity",
                "read:stats",
                "read:users",
                "write:users",
            ],
        },
        rateLimit: {
            type: Number,
            default: 100,
            min: 1,
            max: 10000,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        expiresAt: {
            type: Date,
            default: null,
        },
        lastUsedAt: {
            type: Date,
            default: null,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        contactEmail: {
            type: String,
            trim: true,
            lowercase: true,
        },
        metadata: {
            contactName: String,
            company: String,
            description: String,
        },
        createdBy: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

// ============================================
// Indexes
// ============================================

ApiKeySchema.index({ keyHash: 1 });
ApiKeySchema.index({ isActive: 1 });

// ============================================
// Static Methods
// ============================================

ApiKeySchema.statics.generateKey = function (prefix: string = "lead_ext") {
    const randomPart = crypto.randomBytes(32).toString("hex");
    const apiKey = `${prefix}_${randomPart}`;
    const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
    const keyPrefix = apiKey.substring(0, 12) + "...";

    return { apiKey, keyHash, keyPrefix };
};

ApiKeySchema.statics.hashKey = function (apiKey: string): string {
    return crypto.createHash("sha256").update(apiKey).digest("hex");
};

// ============================================
// Export
// ============================================

export const ApiKeyModel = mongoose.model<ApiKeyDocument, ApiKeyModel>("ApiKey", ApiKeySchema);