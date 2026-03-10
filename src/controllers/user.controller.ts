import { Request, Response } from "express";
import {
  createUser,
  findAllUsers,
  findUserById,
  updateUser,
  deleteUser,
} from "../services/user.service";
import { logActivity } from "../services/activity.service";

// Note: User routes ใช้ API Key auth ไม่มี user info
// ดังนั้น log เป็น "system" หรือ "api-admin"

export const createUserConntroller = async (req: Request, res: Response) => {
  try {
    const { username, password, clinicName, branch, expired } = req.body;

    if (!username || !password || !clinicName || !branch) {
      return res.status(400).json({
        message: "username, password, clinicName and branch are required",
      });
    }

    const user = await createUser({
      username,
      password,
      clinicName,
      branch,
      expired,
    });

    await logActivity({
      userId: "system",
      userName: "API Admin",
      action: "create",
      resource: "user",
      resourceId: user._id.toString(),
      resourceName: username || undefined,
      description: `สร้าง User: ${username} (${clinicName})`,
      metadata: {
        clinicName,
        branch,
        clinicId: user.clinicId,
      },
      req,
    });

    res.status(201).json({
      message: "create user success!",
      data: user,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "username already exists",
      });
    }

    res.status(500).json({
      message: "create user failed",
      error: error.message,
    });
  }
};

export const findAllUserController = async (req: Request, res: Response) => {
  try {
    const users = await findAllUsers();
    res.status(200).json(users);
  } catch (error: any) {
    res.status(400).json({
      error: error,
      message: error.message,
    });
  }
};

export const findOneUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "id is required" });
    }

    const user = await findUserById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ data: user });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const oldUser = await findUserById(id);

    const user = await updateUser(id, req.body);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];

    if (req.body.username && oldUser?.username !== req.body.username) {
      changes.push({
        field: "username",
        oldValue: oldUser?.username,
        newValue: req.body.username,
      });
    }

    if (req.body.clinicName && oldUser?.clinicName !== req.body.clinicName) {
      changes.push({
        field: "clinicName",
        oldValue: oldUser?.clinicName,
        newValue: req.body.clinicName,
      });
    }

    if (req.body.branch && oldUser?.branch !== req.body.branch) {
      changes.push({
        field: "branch",
        oldValue: oldUser?.branch,
        newValue: req.body.branch,
      });
    }

    if (req.body.password) {
      changes.push({
        field: "password",
        oldValue: "***",
        newValue: "***",
      });
    }

    await logActivity({
      userId: "system",
      userName: "API Admin",
      action: "update",
      resource: "user",
      resourceId: user._id?.toString() || id,
      resourceName: user.username ?? undefined,
      description: `แก้ไข User: ${user.username}`,
      changes: changes.length > 0 ? changes : undefined,
      clinicId: user.clinicId,
      clinicName: user.clinicName ?? undefined,
      req,
    });

    res.status(200).json({
      message: "Update user success",
      data: user,
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteUserController = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // ดึงข้อมูลก่อนลบ
    const userToDelete = await findUserById(id);

    const user = await deleteUser(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await logActivity({
      userId: "system",
      userName: "API Admin",
      action: "delete",
      resource: "user",
      resourceId: id,
      resourceName: userToDelete?.username ?? undefined,
      description: `ลบ User: ${userToDelete?.username}`,
      metadata: {
        deletedData: {
          username: userToDelete?.username,
          clinicId: userToDelete?.clinicId,
          clinicName: userToDelete?.clinicName,
        },
      },
      req,
    });

    res.status(200).json({ message: "Deleted successfully" });
  } catch (error: any) {
    res.status(400).json({
      error: error,
      message: error.message,
    });
  }
};