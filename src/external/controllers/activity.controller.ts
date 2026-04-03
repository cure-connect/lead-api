import { Request, Response } from "express";
import {
    createActivity,
    findAllActivities,
    findActivityById,
    findActivitiesByResource,
    findActivitiesByUser,
    getActivityStats,
} from "../../services/activity.service";
import { ActivityDocument } from "../../models/activity";

export const create = async (req: Request, res: Response) => {
    try {
        const {
            userId,
            userName,
            action,
            resource,
            resourceId,
            resourceName,
            description,
            changes,
            metadata,
            clinicId,
            clinicName,
        } = req.body;

        if (!userId || !userName || !action || !resource || !description) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "userId, userName, action, resource and description are required",
                },
            });
        }

        const activity = await createActivity({
            userId,
            userName,
            action,
            resource,
            resourceId,
            resourceName,
            description,
            changes,
            metadata,
            clinicId,
            clinicName,
            req,
        });

        res.status(201).json({
            success: true,
            message: "Activity created",
            data: activity,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create activity" },
        });
    }
};

export const listActivities = async (req: Request, res: Response) => {
    try {
        const {
            user_id,
            action,
            resource,
            resource_id,
            clinic_id,
            start_date,
            end_date,
            search,
            page = "1",
            limit = "50",
            sort_by = "createdAt",
            sort_order = "desc",
        } = req.query;

        const result = await findAllActivities({
            userId: user_id as string,
            action: action as ActivityDocument["action"],
            resource: resource as ActivityDocument["resource"],
            resourceId: resource_id as string,
            clinicId: clinic_id ? parseInt(clinic_id as string) : undefined,
            startDate: start_date ? new Date(start_date as string) : undefined,
            endDate: end_date ? new Date(end_date as string) : undefined,
            search: search as string,
            page: parseInt(page as string),
            limit: Math.min(parseInt(limit as string), 100),
            sortBy: sort_by as string,
            sortOrder: sort_order as "asc" | "desc",
        });

        res.json({
            success: true,
            data: result.data,
            pagination: result.pagination,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve activities" },
        });
    }
};

export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const activity = await findActivityById(id);

        if (!activity) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Activity not found" },
            });
        }

        res.json({ success: true, data: activity });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve activity" },
        });
    }
};

export const getByResource = async (req: Request, res: Response) => {
    try {
        const { resource, resourceId } = req.params;
        const { limit = "100" } = req.query;

        const activities = await findActivitiesByResource(
            resource as ActivityDocument["resource"],
            resourceId,
            Math.min(parseInt(limit as string), 500)
        );

        res.json({ success: true, data: activities, count: activities.length });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve activities" },
        });
    }
};

export const getByUser = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const { limit = "20" } = req.query;

        const activities = await findActivitiesByUser(
            userId,
            Math.min(parseInt(limit as string), 100)
        );

        res.json({ success: true, data: activities, count: activities.length });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve activities" },
        });
    }
};

export const getStats = async (req: Request, res: Response) => {
    try {
        const { clinic_id, start_date, end_date } = req.query;

        const stats = await getActivityStats(
            clinic_id ? parseInt(clinic_id as string) : undefined,
            start_date ? new Date(start_date as string) : undefined,
            end_date ? new Date(end_date as string) : undefined
        );

        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};