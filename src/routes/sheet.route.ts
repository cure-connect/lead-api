import { Router } from 'express';
import { UserModel } from '../models/user';
import { syncClinicLeadsToSheet } from '../services/sheet.service';
import {
  apiKeyMiddleware,
  authMiddleware,
  AuthRequest,
} from '../middleware/auth.middlware';

const router = Router();
const API_KEY = process.env.API_KEY as string;

// ใส่ middleware เหมือน lead.route.ts เพื่อให้ pattern เดียวกัน
router.use(apiKeyMiddleware(API_KEY));
router.use(authMiddleware);

router.post('/sync/leads-sheet', async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ message: 'unauthorized' });

  const user = await UserModel.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'user not found' });

  try {
    const result = await syncClinicLeadsToSheet(user);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;