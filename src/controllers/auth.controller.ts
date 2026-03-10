import { Request, Response } from "express";
import { login, refreshTokenService } from "../services/auth.service";
import { logActivity } from "../services/activity.service";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const result = await login(username, password);

    await logActivity({
      userId: result.clinicId?.toString() || "unknown",
      userName: result.username || "unknown",
      action: "login",
      resource: "user",
      resourceName: result.username || undefined,
      description: `เข้าสู่ระบบ: ${result.username}`,
      metadata: {
        success: true,
        clinicName: result.clinicName,
        branch: result.branch,
      },
      clinicId: result.clinicId,
      clinicName: result.clinicName || undefined,
      req,
    });

    return res.status(200).json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    if (req.body.username) {
      await logActivity({
        userId: "unknown",
        userName: req.body.username,
        action: "login",
        resource: "user",
        resourceName: req.body.username,
        description: `เข้าสู่ระบบล้มเหลว: ${req.body.username}`,
        metadata: {
          success: false,
          reason: error.message,
        },
        req,
      }).catch(() => { }); // ไม่ให้ error จาก activity log กระทบ response
    }

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