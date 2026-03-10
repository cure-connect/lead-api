import mongoose from "mongoose";
import { UserModel } from "../models/user";
import { UserDocument } from "../models/user";
import logger from "./logger.service";

export const createUser = async (data: Partial<UserDocument>) => {
  try {
    const user = await UserModel.create({
      username: data.username,
      password: data.password,
      clinicName: data.clinicName,
      branch: data.branch,
      expired: data.expired
    });

    logger.info("User created", {
      userId: user._id,
      username: user.username,
      clinicId: user.clinicId,
    });

    return user;
  } catch (error: any) {
    logger.error("Failed to create user", {
      error: error.message,
      username: data.username,
    });
    throw error;
  }
};

export const findAllUsers = async () => {
  try {
    const users = await UserModel.find().lean();
    logger.debug("Users fetched", { count: users.length });
    return users;
  } catch (error: any) {
    logger.error("Failed to fetch users", { error: error.message });
    throw error;
  }
};

export const findUserById = async (keyword: string | number) => {
  try {
    const conditions: any[] = [];

    if (typeof keyword === "string" && mongoose.Types.ObjectId.isValid(keyword)) {
      conditions.push({ _id: keyword });
    }

    if (!isNaN(Number(keyword))) {
      conditions.push({ clinicId: Number(keyword) });
    }

    if (typeof keyword === "string") {
      conditions.push({ username: keyword });
    }

    return await UserModel.findOne({
      $or: conditions,
    }).lean();
  } catch (error: any) {
    logger.error("Failed to find user", { error: error.message, keyword });
    throw error;
  }
};

export const updateUser = async (
  keyword: string | number,
  data: Partial<UserDocument>
) => {
  try {
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    if (Object.keys(updateData).length === 0) {
      throw new Error("No data provided for update");
    }

    const conditions: any[] = [];

    if (typeof keyword === "string" && mongoose.Types.ObjectId.isValid(keyword)) {
      conditions.push({ _id: keyword });
    }

    if (!isNaN(Number(keyword))) {
      conditions.push({ clinicId: Number(keyword) });
    }

    if (typeof keyword === "string") {
      conditions.push({ username: keyword });
    }

    const user = await UserModel.findOneAndUpdate(
      { $or: conditions },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    ).lean();

    if (user) {
      logger.info("User updated", { userId: user._id, username: user.username });
    }

    return user;
  } catch (error: any) {
    logger.error("Failed to update user", { error: error.message, keyword });
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const user = await UserModel.findByIdAndDelete(id);

    if (user) {
      logger.info("User deleted", { userId: id, username: user.username });
    }

    return user;
  } catch (error: any) {
    logger.error("Failed to delete user", { error: error.message, userId: id });
    throw error;
  }
};