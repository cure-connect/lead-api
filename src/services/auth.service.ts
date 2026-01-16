import bcrypt from "bcrypt";
import { generateToken } from "../utils/jwt";
import { UserModel } from "../models/user";
import { Request, Response } from "express";
import jwt from "jsonwebtoken";

export const login = async (username: string, password: string) => {
    const user = await UserModel.findOne({ username });

    if (!user) throw new Error("User not found");

    if (!user.password) throw new Error("User password not set");
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error("Invalid credentials");

    const token = generateToken({ _id: user._id, username: user.username, clinicId: user.clinicId, clinicName: user.clinicName, branch: user.branch });

    return {
        token: token,
        username: user.username,
        clinicId: user.clinicId,
        clinicName: user.clinicName,
        branch: user.branch
    };
};