import { Request, Response } from "express";
import { login, refreshTokenService } from "../services/auth.service";

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

export const refreshTokenController = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    const newAccessToken = await refreshTokenService(refreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    res.status(401).json({ message: "Invalid refresh token" });
  }
};
