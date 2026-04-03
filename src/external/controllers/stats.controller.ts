import { Request, Response } from "express";
import { AppointmentModel } from "../../models/appointment";

/**
 * Stats Controller for External API
 */

/**
 * GET /overview
 * Get overall statistics
 */
export const getOverview = async (req: Request, res: Response) => {
    try {
        const { clinic_id, start_date, end_date } = req.query;

        const match: any = {};
        if (clinic_id) match["clinic.clinicId"] = parseInt(clinic_id as string);
        if (start_date || end_date) {
            match.createdAt = {};
            if (start_date) match.createdAt.$gte = new Date(start_date as string);
            if (end_date) match.createdAt.$lte = new Date(end_date as string);
        }

        const [statusStats, total] = await Promise.all([
            AppointmentModel.aggregate([
                { $match: match },
                { $group: { _id: "$appointments.status", count: { $sum: 1 } } },
            ]),
            AppointmentModel.countDocuments(match),
        ]);

        const statusMap: Record<string, number> = {};
        statusStats.forEach((s) => {
            statusMap[s._id || "unknown"] = s.count;
        });

        res.json({
            success: true,
            data: {
                total,
                byStatus: statusMap,
                pending: statusMap.pending || 0,
                scheduled: statusMap.scheduled || 0,
                rescheduled: statusMap.rescheduled || 0,
                arrived: statusMap.arrived || 0,
                cancelled: statusMap.cancelled || 0,
            },
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};

/**
 * GET /finance
 * Get financial statistics
 */
export const getFinance = async (req: Request, res: Response) => {
    try {
        const { clinic_id, start_date, end_date } = req.query;

        const match: any = {
            "appointments.status": "arrived",
            "payments.amount": { $exists: true, $gt: 0 },
        };

        if (clinic_id) match["clinic.clinicId"] = parseInt(clinic_id as string);
        if (start_date || end_date) {
            match["appointments.date"] = {};
            if (start_date) match["appointments.date"].$gte = new Date(start_date as string);
            if (end_date) match["appointments.date"].$lte = new Date(end_date as string);
        }

        const result = await AppointmentModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$payments.amount" },
                    totalNetRevenue: { $sum: { $ifNull: ["$payments.serviceCharge.netAmount", "$payments.amount"] } },
                    totalCommission: { $sum: { $ifNull: ["$payments.commission.totalAmount", 0] } },
                    totalServiceCharge: { $sum: { $ifNull: ["$payments.serviceCharge.amount", 0] } },
                    transactionCount: { $sum: 1 },
                    avgTransaction: { $avg: "$payments.amount" },
                },
            },
        ]);

        const stats = result[0] || {
            totalRevenue: 0,
            totalNetRevenue: 0,
            totalCommission: 0,
            totalServiceCharge: 0,
            transactionCount: 0,
            avgTransaction: 0,
        };

        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};

/**
 * GET /interests
 * Get interest/procedure statistics
 */
export const getInterests = async (req: Request, res: Response) => {
    try {
        const { clinic_id, start_date, end_date, status = "arrived" } = req.query;

        const match: any = {};
        if (status) match["appointments.status"] = status;
        if (clinic_id) match["clinic.clinicId"] = parseInt(clinic_id as string);
        if (start_date || end_date) {
            match["appointments.date"] = {};
            if (start_date) match["appointments.date"].$gte = new Date(start_date as string);
            if (end_date) match["appointments.date"].$lte = new Date(end_date as string);
        }

        const result = await AppointmentModel.aggregate([
            { $match: match },
            { $unwind: "$interests" },
            {
                $group: {
                    _id: "$interests.name",
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 20 },
        ]);

        res.json({
            success: true,
            data: result.map((r) => ({
                name: r._id,
                count: r.count,
            })),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};

/**
 * GET /trends
 * Get monthly trends
 */
export const getTrends = async (req: Request, res: Response) => {
    try {
        const { clinic_id, months = "12" } = req.query;

        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - parseInt(months as string));

        const match: any = {
            createdAt: { $gte: startDate },
        };
        if (clinic_id) match["clinic.clinicId"] = parseInt(clinic_id as string);

        const result = await AppointmentModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
                    total: { $sum: 1 },
                    arrived: {
                        $sum: { $cond: [{ $eq: ["$appointments.status", "arrived"] }, 1, 0] },
                    },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$appointments.status", "arrived"] },
                                { $ifNull: ["$payments.amount", 0] },
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]);

        res.json({
            success: true,
            data: result.map((r) => ({
                year: r._id.year,
                month: r._id.month,
                period: `${r._id.year}-${String(r._id.month).padStart(2, "0")}`,
                total: r.total,
                arrived: r.arrived,
                revenue: r.revenue,
                conversionRate: r.total > 0 ? Math.round((r.arrived / r.total) * 100) : 0,
            })),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};

/**
 * GET /clinics
 * Get statistics by clinic
 */
export const getByClinics = async (req: Request, res: Response) => {
    try {
        const { start_date, end_date } = req.query;

        const match: any = {};
        if (start_date || end_date) {
            match.createdAt = {};
            if (start_date) match.createdAt.$gte = new Date(start_date as string);
            if (end_date) match.createdAt.$lte = new Date(end_date as string);
        }

        const result = await AppointmentModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: {
                        clinicId: "$clinic.clinicId",
                        clinicName: "$clinic.name",
                        branch: "$clinic.branch",
                    },
                    total: { $sum: 1 },
                    arrived: {
                        $sum: { $cond: [{ $eq: ["$appointments.status", "arrived"] }, 1, 0] },
                    },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ["$appointments.status", "arrived"] },
                                { $ifNull: ["$payments.amount", 0] },
                                0,
                            ],
                        },
                    },
                },
            },
            { $sort: { revenue: -1 } },
        ]);

        res.json({
            success: true,
            data: result.map((r) => ({
                clinicId: r._id.clinicId,
                clinicName: r._id.clinicName,
                branch: r._id.branch,
                total: r.total,
                arrived: r.arrived,
                revenue: r.revenue,
                conversionRate: r.total > 0 ? Math.round((r.arrived / r.total) * 100) : 0,
            })),
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve stats" },
        });
    }
};