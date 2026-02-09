import { Router } from "express";
import {
  createLeadController,
  getLeadsController,
  getLeadByIdController,
  updateLeadController,
  deleteLeadController,
  getLeadHistoryController,
  getNextLeadsController,
} from "../controllers/lead.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Lead
 *   description: Lead management APIs
 */

/**
 * @swagger
 * /lead/v1/api/createlead:
 *   post:
 *     tags: [Lead]
 *     summary: Create new lead
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
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       201:
 *         description: Lead created
 */
router.post("/createlead", createLeadController);

/**
 * @swagger
 * /lead/v1/api/lead:
 *   get:
 *     tags: [Lead]
 *     summary: Get all leads
 *     security:
 *       - ApiKeyAuth: []
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of leads
 */
router.get("/lead", getLeadsController);

router.get("/:id/history", getLeadHistoryController);
router.get("/:id/next", getNextLeadsController);

/**
 * @swagger
 * /lead/v1/api/{id}:
 *   get:
 *     tags: [Lead]
 *     summary: Get lead by ID
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
 *         description: Lead detail
 */
router.get("/:id", getLeadByIdController);

/**
 * @swagger
 * /lead/v1/api/{id}:
 *   patch:
 *     tags: [Lead]
 *     summary: Update lead
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
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Lead updated
 */
router.patch("/:id", updateLeadController);

/**
 * @swagger
 * /lead/v1/api/{id}:
 *   delete:
 *     tags: [Lead]
 *     summary: Delete lead
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
 *         description: Lead deleted
 */
router.delete("/:id", deleteLeadController);

export default router;