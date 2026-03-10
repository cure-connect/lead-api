import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};

winston.addColors(colors);

// Custom format
const customFormat = winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
        let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        // Add metadata if exists
        if (Object.keys(meta).length > 0) {
            log += ` ${JSON.stringify(meta)}`;
        }

        // Add stack trace for errors
        if (stack) {
            log += `\n${stack}`;
        }

        return log;
    })
);

// Console format (with colors)
const consoleFormat = winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0 && !meta.stack) {
            log += ` ${JSON.stringify(meta)}`;
        }
        return log;
    })
);

// JSON format for file logs
const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Log directory
const logDir = process.env.LOG_DIR || "logs";

// Create transports
const transports: winston.transport[] = [];

// Console transport (always enabled in development)
if (process.env.NODE_ENV !== "production") {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
        })
    );
}

// File transports
// Error logs
transports.push(
    new DailyRotateFile({
        filename: path.join(logDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "error",
        format: jsonFormat,
        maxSize: "20m",
        maxFiles: "30d",
        zippedArchive: true,
    })
);

// Combined logs (all levels)
transports.push(
    new DailyRotateFile({
        filename: path.join(logDir, "combined-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        format: jsonFormat,
        maxSize: "20m",
        maxFiles: "14d",
        zippedArchive: true,
    })
);

// HTTP request logs
transports.push(
    new DailyRotateFile({
        filename: path.join(logDir, "http-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        level: "http",
        format: jsonFormat,
        maxSize: "20m",
        maxFiles: "7d",
        zippedArchive: true,
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    levels,
    format: customFormat,
    transports,
    exitOnError: false,
});

// Create child loggers for specific contexts
export const createContextLogger = (context: string) => {
    return {
        error: (message: string, meta?: object) =>
            logger.error(message, { context, ...meta }),
        warn: (message: string, meta?: object) =>
            logger.warn(message, { context, ...meta }),
        info: (message: string, meta?: object) =>
            logger.info(message, { context, ...meta }),
        http: (message: string, meta?: object) =>
            logger.http(message, { context, ...meta }),
        debug: (message: string, meta?: object) =>
            logger.debug(message, { context, ...meta }),
    };
};

// Export main logger
export default logger;

// Export helper functions
export const logError = (message: string, error?: Error, meta?: object) => {
    logger.error(message, {
        error: error?.message,
        stack: error?.stack,
        ...meta,
    });
};

export const logRequest = (req: any, res: any, responseTime: number) => {
    logger.http("HTTP Request", {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        responseTime: `${responseTime}ms`,
        ip: req.ip || req.headers["x-forwarded-for"],
        userAgent: req.headers["user-agent"],
        userId: req.user?.id,
    });
};

export const logDatabase = (operation: string, collection: string, duration?: number, meta?: object) => {
    logger.debug(`DB ${operation}`, {
        context: "database",
        collection,
        duration: duration ? `${duration}ms` : undefined,
        ...meta,
    });
};