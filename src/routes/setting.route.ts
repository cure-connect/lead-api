import { Router } from "express";
import { createSettingController, deleteSettingController, editSettingController, getAllSettingController } from "../controllers/setting.controller";
import { getAllAdminController , getAdminByIdController, editAdminController, deleteAdminController} from "../controllers/admin.controller"
import { getAllBranchController, getBranchByIdController, editBranchController, deleteBranchController } from "../controllers/branch.controller"
import { getAllChannelController, getChannelByIdController, editChannelController, deleteChannelController } from "../controllers/channel.controller";
import { getAllInterestController, getInterestByIdController, editInterestController, deleteInterestController } from "../controllers/interest.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";
import { createSettings } from "../services/setting.service";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

router.post('/setting/create', createSettingController)

//Admin
router.get('/setting/getadmin', getAllAdminController)
router.get('/setting/getadmin/:id', getAdminByIdController)
router.patch('/setting/editadmin/:id', editAdminController)
router.delete('/setting/deleteadmin/:id', deleteAdminController)

//Branch
router.get('/setting/getbranch', getAllBranchController)
router.get('/setting/getbranch/:id', getBranchByIdController)
router.patch('/setting/editbranch/:id', editBranchController)
router.delete('/setting/deletebranch/:id', deleteBranchController)

//Channel
router.get('/setting/getchannel', getAllChannelController)
router.get('/setting/getchannel/:id', getChannelByIdController)
router.patch('/setting/editchannel/:id', editChannelController)
router.delete('/setting/deletechannel/:id', deleteChannelController)

//Interest
router.get('/setting/getinterest', getAllInterestController)
router.get('/setting/getinterest/:id', getInterestByIdController)
router.patch('/setting/editinterest/:id', editInterestController)
router.delete('/setting/deleteinterest/:id', deleteInterestController)

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