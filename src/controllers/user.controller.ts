import { Request, Response } from "express";
import {
    createUser,
    findAllUsers,
    findUserById,
    updateUser,
    deleteUser,
} from "../services/user.service";

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
            message: error.message
        })
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
    const user = await updateUser(req.params.id, req.body);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

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
        const user = await deleteUser(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.status(200).json({ message: "Deleted successfully" });
    } catch (error: any) {
        res.status(400).json({
            error: error,
            message: error.message
        })
    }
};
