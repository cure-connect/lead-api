import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { generateToken } from "../utils/jwt";
import bcrypt from "bcrypt";
import { UserModel } from "../models/user";

export const apiKeyMiddleware = (secretKey: string) => (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      return res.status(401).json({ error: "x-api-key is required" });
    }

    if (apiKey !== secretKey) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    next();
  };


export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
    clinicId: number;
    clinicName: string;
    branch: string;
  };
}

export interface JwtPayload {
  _id: string;
  username: string;
  clinicId: number;
  clinicName: string;
  branch: string;
  iat: number;
  exp: number;
}


export const authMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as JwtPayload;

    req.user = {
      id: decoded._id,
      username: decoded.username,
      clinicId: decoded.clinicId,
      clinicName: decoded.clinicName,
      branch: decoded.branch,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
