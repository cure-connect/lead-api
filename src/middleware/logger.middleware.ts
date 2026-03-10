import { Request, Response, NextFunction } from "express";
import logger from "../services/logger.service";

export const httpLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? "warn" : "http";

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip,
      userAgent: req.headers["user-agent"],
      userId: (req as any).user?.id,
      contentLength: res.get("content-length"),
    };

    if (logLevel === "warn") {
      logger.warn(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
    } else {
      logger.http(`${req.method} ${req.originalUrl} ${res.statusCode}`, logData);
    }
  });

  next();
};

export const errorLoggerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error("Unhandled Error", {
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: (req as any).user?.id,
    body: req.body,
    query: req.query,
  });

  next(err);
};