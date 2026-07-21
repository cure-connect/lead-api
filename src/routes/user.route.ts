import { Router } from "express";
import {
  createUserConntroller,
  findAllUserController,
  findOneUserController,
  updateUserController,
  deleteUserController,
} from "../controllers/user.controller";
import { apiKeyMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management APIs
 */

/**
 * @swagger
 * /lead/v1/api/user/create:
 *   post:
 *     tags: [User]
 *     summary: Create user
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 example: earth
 *               email:
 *                 type: string
 *                 example: earth@test.com
 *     responses:
 *       201:
 *         description: User created
 */
router.post("/user/create", createUserConntroller);

/**
 * @swagger
 * /lead/v1/api/user/getall:
 *   get:
 *     tags: [User]
 *     summary: Get all users
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of users
 */
router.get("/user/getall", findAllUserController);

/**
 * @swagger
 * /lead/v1/api/user/getuserbyid/{id}:
 *   get:
 *     tags: [User]
 *     summary: Get user by ID
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User detail
 */
router.get("/user/getuserbyid/:id", findOneUserController);

/**
 * @swagger
 * /lead/v1/api/user/edituser/{id}:
 *   patch:
 *     tags: [User]
 *     summary: Update user
 *     security:
 *       - ApiKeyAuth: []
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
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User updated
 */
router.patch("/user/edituser/:id", updateUserController);

/**
 * @swagger
 * /lead/v1/api/user/deleteuser/{id}:
 *   delete:
 *     tags: [User]
 *     summary: Delete user
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deleted
 */
router.delete("/user/deleteuser/:id", deleteUserController);

export default router;
//Test