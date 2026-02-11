import { Router } from "express";
import { createSettingController, deleteSettingController, editSettingController, getAllSettingController } from "../controllers/setting.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

router.post('/setting/create', createSettingController)

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
 *               key:
 *                 type: string
 *                 example: lead_type
 *               value:
 *                 type: string
 *                 example: hot
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
 *     summary: Get all setting types
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of settings
 */
router.get("/setting/gettype", authMiddleware, getAllSettingController);

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
 *               value:
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
router.delete(
  "/setting/deletesetting/:id",
  authMiddleware,
  deleteSettingController
);

export default router;