import { Request, Response } from "express";
import {
    createUser,
    findAllUsers,
    findUserById,
    updateUser,
    deleteUser,
} from "../../services/user.service";
import logger from "../../services/logger.service";

/**
 * User Controller for External API
 * Full CRUD access to users
 */

/**
 * GET /
 * List all users
 */
export const listUsers = async (req: Request, res: Response) => {
    try {
        const {
            page = "1",
            limit = "50",
            search,
            sort_by = "createdAt",
            sort_order = "desc",
        } = req.query;

        let users = await findAllUsers();

        // Search filter
        if (search) {
            const searchStr = (search as string).toLowerCase();
            users = users.filter(
                (u: any) =>
                    u.username?.toLowerCase().includes(searchStr) ||
                    u.clinicName?.toLowerCase().includes(searchStr) ||
                    u.branch?.toLowerCase().includes(searchStr)
            );
        }

        // Sort
        users.sort((a: any, b: any) => {
            const aVal = a[sort_by as string];
            const bVal = b[sort_by as string];
            if (sort_order === "asc") {
                return aVal > bVal ? 1 : -1;
            }
            return aVal < bVal ? 1 : -1;
        });

        // Pagination
        const pageNum = parseInt(page as string);
        const limitNum = Math.min(parseInt(limit as string), 100);
        const skip = (pageNum - 1) * limitNum;
        const total = users.length;
        const paginatedUsers = users.slice(skip, skip + limitNum);

        // Remove password from response
        const safeUsers = paginatedUsers.map((u: any) => {
            const { password, ...rest } = u;
            return rest;
        });

        res.json({
            success: true,
            data: safeUsers,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                totalPages: Math.ceil(total / limitNum),
                hasNext: pageNum * limitNum < total,
                hasPrev: pageNum > 1,
            },
        });
    } catch (error: any) {
        logger.error("External API: Failed to list users", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve users" },
        });
    }
};

/**
 * GET /:id
 * Get single user by ID, clinicId, or username
 */
export const getById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await findUserById(id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }

        // Remove password from response
        const { password, ...safeUser } = user as any;

        res.json({ success: true, data: safeUser });
    } catch (error: any) {
        logger.error("External API: Failed to get user", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve user" },
        });
    }
};

/**
 * POST /
 * Create new user
 */
export const create = async (req: Request, res: Response) => {
    try {
        const { username, password, clinicName, branch, expired } = req.body;

        // Validation
        if (!username || !password || !clinicName || !branch) {
            return res.status(400).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "username, password, clinicName, branch are required",
                },
            });
        }

        const user = await createUser({
            username,
            password,
            clinicName,
            branch,
            expired,
        });

        // Remove password from response
        const userObj = user.toObject();
        const { password: _, ...safeUser } = userObj;

        logger.info("External API: User created", {
            userId: user._id,
            username: user.username,
            apiKey: (req as any).apiKey?.name,
        });

        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: safeUser,
        });
    } catch (error: any) {
        logger.error("External API: Failed to create user", { error: error.message });

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: { code: "DUPLICATE_ERROR", message: "Username already exists" },
            });
        }

        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to create user" },
        });
    }
};

/**
 * PUT /:id
 * Update user
 */
export const update = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { username, password, clinicName, branch, expired } = req.body;

        // Check if user exists
        const existing = await findUserById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }

        const user = await updateUser(id, {
            username,
            password,
            clinicName,
            branch,
            expired,
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }

        // Remove password from response
        const { password: _, ...safeUser } = user as any;

        logger.info("External API: User updated", {
            userId: id,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "User updated successfully",
            data: safeUser,
        });
    } catch (error: any) {
        logger.error("External API: Failed to update user", { error: error.message });

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: { code: "DUPLICATE_ERROR", message: "Username already exists" },
            });
        }

        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to update user" },
        });
    }
};

/**
 * DELETE /:id
 * Delete user
 */
export const remove = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Check if user exists
        const existing = await findUserById(id);
        if (!existing) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }

        await deleteUser(id);

        logger.info("External API: User deleted", {
            userId: id,
            username: (existing as any).username,
            apiKey: (req as any).apiKey?.name,
        });

        res.json({
            success: true,
            message: "User deleted successfully",
        });
    } catch (error: any) {
        logger.error("External API: Failed to delete user", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to delete user" },
        });
    }
};

/**
 * GET /clinic/:clinicId
 * Get user by clinic ID
 */
export const getByClinicId = async (req: Request, res: Response) => {
    try {
        const { clinicId } = req.params;
        const user = await findUserById(parseInt(clinicId));

        if (!user) {
            return res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "User not found" },
            });
        }

        // Remove password from response
        const { password, ...safeUser } = user as any;

        res.json({ success: true, data: safeUser });
    } catch (error: any) {
        logger.error("External API: Failed to get user by clinicId", { error: error.message });
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Failed to retrieve user" },
        });
    }
};