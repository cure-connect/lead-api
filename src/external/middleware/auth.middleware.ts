import { Request, Response, NextFunction } from "express";
import { validateApiKey } from "../../services/api-key.service";
import logger from "../../services/logger.service";

// ============================================
// Rate Limiting (In-Memory)
// ============================================

const rateLimitStore: Map<string, { count: number; resetAt: number }> = new Map();

const checkRateLimit = (keyId: string, limit: number): boolean => {
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute

    const record = rateLimitStore.get(keyId);

    if (!record || now > record.resetAt) {
        rateLimitStore.set(keyId, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (record.count >= limit) {
        return false;
    }

    record.count++;
    return true;
};

// ============================================
// Middleware
// ============================================

/**
 * External API Authentication Middleware
 * อ่าน API Key จาก Database
 */
export const externalApiAuth = (requiredPermissions?: string[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Extract API Key from header or query
            const apiKey =
                (req.headers["x-api-key"] as string) ||
                req.headers["authorization"]?.replace("Bearer ", "") ||
                (req.query.api_key as string);

            if (!apiKey) {
                logger.warn("External API: Missing API key", {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        code: "MISSING_API_KEY",
                        message: "API key is required. Use X-API-Key header.",
                    },
                });
            }

            // Validate API Key from Database
            const keyDoc = await validateApiKey(apiKey);

            if (!keyDoc) {
                logger.warn("External API: Invalid API key", {
                    ip: req.ip,
                    path: req.path,
                    method: req.method,
                    keyPreview: apiKey.substring(0, 12) + "...",
                });

                return res.status(401).json({
                    success: false,
                    error: {
                        code: "INVALID_API_KEY",
                        message: "Invalid or expired API key",
                    },
                });
            }

            // Check permissions
            if (requiredPermissions && requiredPermissions.length > 0) {
                const hasPermission = requiredPermissions.every(
                    (perm) =>
                        keyDoc.permissions.includes(perm) ||
                        keyDoc.permissions.includes("*")
                );

                if (!hasPermission) {
                    logger.warn("External API: Insufficient permissions", {
                        ip: req.ip,
                        path: req.path,
                        keyName: keyDoc.name,
                        required: requiredPermissions,
                        userPermissions: keyDoc.permissions,
                    });

                    return res.status(403).json({
                        success: false,
                        error: {
                            code: "INSUFFICIENT_PERMISSIONS",
                            message: "Insufficient permissions for this endpoint",
                            required: requiredPermissions,
                            your_permissions: keyDoc.permissions,
                        },
                    });
                }
            }

            // Check rate limit
            if (!checkRateLimit(keyDoc._id.toString(), keyDoc.rateLimit)) {
                logger.warn("External API: Rate limit exceeded", {
                    ip: req.ip,
                    path: req.path,
                    keyName: keyDoc.name,
                    rateLimit: keyDoc.rateLimit,
                });

                return res.status(429).json({
                    success: false,
                    error: {
                        code: "RATE_LIMIT_EXCEEDED",
                        message: `Rate limit exceeded. Limit: ${keyDoc.rateLimit} requests/minute`,
                    },
                });
            }

            // Log successful access
            logger.debug("External API: Access granted", {
                keyName: keyDoc.name,
                path: req.path,
                method: req.method,
            });

            // Attach key info to request
            (req as any).apiKey = {
                id: keyDoc._id,
                name: keyDoc.name,
                permissions: keyDoc.permissions,
                rateLimit: keyDoc.rateLimit,
            };

            next();
        } catch (error: any) {
            logger.error("External API: Auth error", {
                error: error.message,
                ip: req.ip,
                path: req.path,
            });

            return res.status(500).json({
                success: false,
                error: {
                    code: "AUTH_ERROR",
                    message: "Authentication error",
                },
            });
        }
    };
};