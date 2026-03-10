import { Router } from "express";
import {
  createSettingController,
  deleteSettingController,
  editSettingController,
  getAllSettingController,
  toggleFeatureController,
  getConfigController,
} from "../controllers/setting.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

/**
 * @swagger
 * tags:
 *   name: Setting
 *   description: Setting management APIs
 */

/**
 * @swagger
 * /lead/v1/api/setting/createsetting:
 *   post:
 *     tags: [Setting]
 *     summary: Create setting
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [admin, branch, channel, interest, procedure]
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Setting created
 */
router.post("/setting/createsetting", authMiddleware, createSettingController);

/**
 * @swagger
 * /lead/v1/api/setting/gettype:
 *   get:
 *     tags: [Setting]
 *     summary: Get all setting types with config
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of settings with config
 */
router.get("/setting/gettype", authMiddleware, getAllSettingController);

/**
 * @swagger
 * /lead/v1/api/setting/config:
 *   get:
 *     tags: [Setting]
 *     summary: Get clinic config (feature toggles)
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Clinic config
 */
router.get("/setting/config", authMiddleware, getConfigController);

/**
 * @swagger
 * /lead/v1/api/setting/config/toggle:
 *   patch:
 *     tags: [Setting]
 *     summary: Toggle feature on/off
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feature:
 *                 type: string
 *                 enum: [procedure]
 *               enabled:
 *                 type: boolean
 *               allowCustom:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Feature toggled
 */
router.patch("/setting/config/toggle", authMiddleware, toggleFeatureController);

/**
 * @swagger
 * /lead/v1/api/setting/editsetting/{id}:
 *   patch:
 *     tags: [Setting]
 *     summary: Edit setting
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Setting updated
 */
router.patch("/setting/editsetting/:id", authMiddleware, editSettingController);

/**
 * @swagger
 * /lead/v1/api/setting/deletesetting/{id}:
 *   delete:
 *     tags: [Setting]
 *     summary: Delete setting
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Setting deleted
 */
router.delete("/setting/deletesetting/:id", authMiddleware, deleteSettingController);

export default router;