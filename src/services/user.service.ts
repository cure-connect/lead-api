import mongoose from "mongoose";
import { UserModel } from "../models/user";
import { UserDocument } from "../models/user";

export const createUser = async (data: Partial<UserDocument>) => {
    const create = await UserModel.create({
        username: data.username,
        password: data.password,
        clinicName: data.clinicName,
        branch: data.branch,
        expired: data.expired
    })
    return create
};

export const findAllUsers = async () => {
    return UserModel.find().lean();
};

export const findUserById = async (keyword: string | number) => {
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

  return UserModel.findOne({
    $or: conditions,
  }).lean();
};

export const updateUser = async (
  keyword: string | number,
  data: Partial<UserDocument>
) => {
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

  return UserModel.findOneAndUpdate(
    { $or: conditions },
    updateData,
    {
      new: true,
      runValidators: true,
    }
  ).lean();
};



export const deleteUser = async (id: string) => {
    return UserModel.findByIdAndDelete(id);
};
