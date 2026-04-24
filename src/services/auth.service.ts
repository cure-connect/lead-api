import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import { UserModel } from "../models/user";
import jwt from "jsonwebtoken";
import logger from "./logger.service";

export const login = async (username: string, password: string) => {
    try {
        const normalizedUsername = (username || "").trim().toLowerCase();

        const user = await UserModel.findOne({
            username: { $regex: `^${normalizedUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" }
        });

        if (!user) {
            logger.warn("Login failed - user not found", { username });
            throw new Error("User not found");
        }

        if (!user.password) {
            logger.warn("Login failed - password not set", { username });
            throw new Error("User password not set");
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            logger.warn("Login failed - invalid credentials", { username });
            throw new Error("Invalid credentials");
        }

        const payload = {
            _id: user._id,
            username: user.username,
            clinicId: user.clinicId,
            clinicName: user.clinicName,
            branch: user.branch,
        };

        const accessToken = await generateAccessToken(payload);
        const refreshToken = await generateRefreshToken(payload);

        logger.info("User logged in", {
            username: user.username,
            clinicId: user.clinicId,
        });

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            username: user.username,
            clinicId: user.clinicId,
            clinicName: user.clinicName,
            branch: user.branch,
        };
    } catch (error: any) {
        if (!["User not found", "User password not set", "Invalid credentials"].includes(error.message)) {
            logger.error("Login error", { error: error.message, username });
        }
        throw error;
    }
};

interface TokenPayload {
    _id: string;
    username: string;
    clinicId: string;
    clinicName: string;
    branch: string;
}

export const refreshTokenService = async (refreshToken: string) => {
    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET as string
        ) as TokenPayload;

        logger.debug("Token refreshed", { username: decoded.username });

        const newToken = await generateAccessToken({
            _id: decoded._id,
            username: decoded.username,
            clinicId: decoded.clinicId,
            clinicName: decoded.clinicName,
            branch: decoded.branch,
        });

        return newToken;
    } catch (error: any) {
        logger.warn("Token refresh failed", { error: error.message });
        throw error;
    }
};