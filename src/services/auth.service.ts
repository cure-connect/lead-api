import bcrypt from "bcrypt";
import { generateAccessToken, generateRefreshToken, generateToken } from "../utils/jwt";
import { UserModel } from "../models/user";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const login = async (username: string, password: string) => {
    const user = await UserModel.findOne({ username });

    if (!user) throw new Error("User not found");

    if (!user.password) throw new Error("User password not set");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const payload = {
        _id: user._id,
        username: user.username,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        branch: user.branch,
    };

    //const token = generateToken({ _id: user._id, username: user.username, clinicId: user.clinicId, clinicName: user.clinicName, branch: user.branch });

    const accessToken = await generateAccessToken(payload);
    const refreshToken = await generateRefreshToken(payload);

    return {
        accessToken: accessToken,
        refreshToken: refreshToken,
        username: user.username,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        branch: user.branch,
    };
};

interface TokenPayload {
    _id: string;
    username: string;
    clinicId: string;
    clinicName: string;
    branch: string;
}

export const refreshTokenService = async (refreshToken: string) => {
    const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string
    ) as TokenPayload;

    console.log('decode', decoded)

    const newToken = await generateAccessToken({
        _id: decoded._id,
        username: decoded.username,
        clinicId: decoded.clinicId,
        clinicName: decoded.clinicName,
        branch: decoded.branch,
    });

    return newToken
};