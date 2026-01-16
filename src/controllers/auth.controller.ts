import { Request, Response } from "express";
import { login } from "../services/auth.service";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const token = await login(username, password);
    return res.status(200).json({
      status: 'success',
      data: token
    })
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
};