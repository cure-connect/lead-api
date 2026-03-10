import mongoose from "mongoose";
import { Request } from "express";
import { ActivityModel, ActivityDocument } from "../models/activity";
import logger from "./logger.service";

export interface CreateActivityData {
    userId: string;
    userName: string;
    action: ActivityDocument["action"];
    resource: ActivityDocument["resource"];
    resourceId?: string;
    resourceName?: string;
    description: string;
    changes?: ActivityDocument["changes"];
    metadata?: Record<string, any>;
    clinicId?: number;
    clinicName?: string;
    req?: Request;
}

export interface QueryActivityParams {
    userId?: string;
    action?: ActivityDocument["action"];
    resource?: ActivityDocument["resource"];
    resourceId?: string;
    clinicId?: number;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

export const createActivity = async (data: CreateActivityData) => {
    try {
        const ipAddress = data.req
            ? (data.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
            data.req.socket?.remoteAddress ||
            data.req.ip
            : undefined;

        const userAgent = data.req?.headers["user-agent"];

        const activity = await ActivityModel.create({
            userId: data.userId,
            userName: data.userName,
            action: data.action,
            resource: data.resource,
            resourceId: data.resourceId,
            resourceName: data.resourceName,
            description: data.description,
            changes: data.changes,
            metadata: data.metadata,
            ipAddress,
            userAgent,
            clinicId: data.clinicId,
            clinicName: data.clinicName,
        });

        return activity;
    } catch (error: any) {
        logger.error("Failed to create activity log", {
            error: error.message,
            action: data.action,
            resource: data.resource,
            userId: data.userId,
        });
        throw error;
    }
};

export const findAllActivities = async (params: QueryActivityParams = {}) => {
    try {
        const {
            userId,
            action,
            resource,
            resourceId,
            clinicId,
            startDate,
            endDate,
            search,
            page = 1,
            limit = 50,
            sortBy = "createdAt",
            sortOrder = "desc",
        } = params;

        const query: any = {};

        if (userId) query.userId = userId;
        if (action) query.action = action;
        if (resource) query.resource = resource;
        if (resourceId) query.resourceId = resourceId;
        if (clinicId) query.clinicId = clinicId;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = startDate;
            if (endDate) query.createdAt.$lte = endDate;
        }

        if (search) {
            query.$or = [
                { description: { $regex: search, $options: "i" } },
                { resourceName: { $regex: search, $options: "i" } },
                { userName: { $regex: search, $options: "i" } },
            ];
        }

        const skip = (page - 1) * limit;
        const sort: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

        const [data, total] = await Promise.all([
            ActivityModel.find(query).sort(sort).skip(skip).limit(limit).lean(),
            ActivityModel.countDocuments(query),
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    } catch (error: any) {
        logger.error("Failed to fetch activities", { error: error.message });
        throw error;
    }
};

export const findActivityById = async (keyword: string) => {
    try {
        if (mongoose.Types.ObjectId.isValid(keyword)) {
            return await ActivityModel.findById(keyword).lean();
        }
        return null;
    } catch (error: any) {
        logger.error("Failed to find activity", { error: error.message, keyword });
        throw error;
    }
};

export const findActivitiesByResource = async (
    resource: ActivityDocument["resource"],
    resourceId: string,
    limit: number = 100
) => {
    try {
        return await ActivityModel.find({ resource, resourceId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    } catch (error: any) {
        logger.error("Failed to find activities by resource", {
            error: error.message,
            resource,
            resourceId,
        });
        throw error;
    }
};

export const findActivitiesByUser = async (userId: string, limit: number = 20) => {
    try {
        return await ActivityModel.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    } catch (error: any) {
        logger.error("Failed to find activities by user", {
            error: error.message,
            userId,
        });
        throw error;
    }
};

export const deleteActivity = async (id: string) => {
    try {
        return await ActivityModel.findByIdAndDelete(id);
    } catch (error: any) {
        logger.error("Failed to delete activity", { error: error.message, id });
        throw error;
    }
};

export const deleteOldActivities = async (daysToKeep: number = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const result = await ActivityModel.deleteMany({
            createdAt: { $lt: cutoffDate },
        });

        logger.info("Old activities cleaned up", {
            daysToKeep,
            deletedCount: result.deletedCount,
        });

        return result.deletedCount;
    } catch (error: any) {
        logger.error("Failed to cleanup old activities", { error: error.message });
        throw error;
    }
};

export const getActivityStats = async (
    clinicId?: number,
    startDate?: Date,
    endDate?: Date
) => {
    try {
        const match: any = {};
        if (clinicId) match.clinicId = clinicId;
        if (startDate || endDate) {
            match.createdAt = {};
            if (startDate) match.createdAt.$gte = startDate;
            if (endDate) match.createdAt.$lte = endDate;
        }

        const [byAction, byResource, topUsers] = await Promise.all([
            ActivityModel.aggregate([
                { $match: match },
                { $group: { _id: "$action", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            ActivityModel.aggregate([
                { $match: match },
                { $group: { _id: "$resource", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            ActivityModel.aggregate([
                { $match: match },
                {
                    $group: {
                        _id: "$userId",
                        userName: { $first: "$userName" },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);

        return { byAction, byResource, topUsers };
    } catch (error: any) {
        logger.error("Failed to get activity stats", { error: error.message });
        throw error;
    }
};

export const logActivity = (data: CreateActivityData) => {
    return createActivity(data);
};