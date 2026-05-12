import { Router } from "express";
import {
    createPatientController,
    searchPatientsController,
    getPatientController,
    getAllPatientsController,
    updatePatientController,
    addDepositController,
    useDepositController,
    refundDepositController,
    adjustBalanceController,
    getTransactionsController,
    getPatientAppointmentsController,
    checkTelController,
    getNewPatientsByMonthController
} from "../controllers/patient.controller";
import { apiKeyMiddleware, authMiddleware } from "../middleware/auth.middlware";

const router = Router();

const API_KEY = process.env.API_KEY as string;

router.use(apiKeyMiddleware(API_KEY));

/**
 * @swagger
 * tags:
 *   name: Patient
 *   description: Patient management APIs
 */

/**
 * @swagger
 * /lead/v1/api/patient/search:
 *   get:
 *     tags: [Patient]
 *     summary: Search patients (autocomplete)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query (name, nickname, tel)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Max results (default 10)
 */
router.get("/patient/search", authMiddleware, searchPatientsController);

/**
 * @swagger
 * /lead/v1/api/patient/check-tel:
 *   get:
 *     tags: [Patient]
 *     summary: Check duplicate phone number
 *     parameters:
 *       - in: query
 *         name: tel
 *         schema:
 *           type: string
 *       - in: query
 *         name: excludeId
 *         schema:
 *           type: string
 */
router.get("/patient/check-tel", authMiddleware, checkTelController);

/**
 * @swagger
 * /lead/v1/api/patient:
 *   get:
 *     tags: [Patient]
 *     summary: Get all patients
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: hasBalance
 *         schema:
 *           type: boolean
 */
router.get("/patient", authMiddleware, getAllPatientsController);

/**
 * @swagger
 * /lead/v1/api/patient/new:
 *   get:
 *     tags: [Patient]
 *     summary: Get new patients by month (based on first appointment date)
 *     description: |
 *       ดึงคนไข้ใหม่ของเดือนที่ระบุ โดยใช้ "วันนัดหมายแรกสุด" เป็นเกณฑ์
 *       ถ้าคนไข้ไม่มีนัดเลย จะ fallback ใช้ createdAt ของ patient
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         description: ปี ค.ศ. (default = ปีปัจจุบัน)
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         description: เดือน 1-12 (default = เดือนปัจจุบัน)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 */
router.get("/patient/new", authMiddleware, getNewPatientsByMonthController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient by ID
 */
router.get("/patient/:id", authMiddleware, getPatientController);

/**
 * @swagger
 * /lead/v1/api/patient:
 *   post:
 *     tags: [Patient]
 *     summary: Create new patient
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullname
 *             properties:
 *               fullname:
 *                 type: string
 *               nickname:
 *                 type: string
 *               tel:
 *                 type: string
 *               socialMedia:
 *                 type: string
 */
router.post("/patient", authMiddleware, createPatientController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}:
 *   patch:
 *     tags: [Patient]
 *     summary: Update patient
 */
router.patch("/patient/:id", authMiddleware, updatePatientController);

// ============================================
// Balance / Wallet Operations
// ============================================

/**
 * @swagger
 * /lead/v1/api/patient/{id}/deposit:
 *   post:
 *     tags: [Patient]
 *     summary: Add deposit to patient wallet
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *               description:
 *                 type: string
 *               appointmentId:
 *                 type: string
 */
router.post("/patient/:id/deposit", authMiddleware, addDepositController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}/use-deposit:
 *   post:
 *     tags: [Patient]
 *     summary: Use deposit from patient wallet
 */
router.post("/patient/:id/use-deposit", authMiddleware, useDepositController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}/refund:
 *   post:
 *     tags: [Patient]
 *     summary: Refund deposit to patient
 */
router.post("/patient/:id/refund", authMiddleware, refundDepositController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}/adjust:
 *   post:
 *     tags: [Patient]
 *     summary: Adjust balance (admin only)
 */
router.post("/patient/:id/adjust", authMiddleware, adjustBalanceController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}/transactions:
 *   get:
 *     tags: [Patient]
 *     summary: Get transaction history
 */
router.get("/patient/:id/transactions", authMiddleware, getTransactionsController);

/**
 * @swagger
 * /lead/v1/api/patient/{id}/appointments:
 *   get:
 *     tags: [Patient]
 *     summary: Get patient's appointment history
 */
router.get("/patient/:id/appointments", authMiddleware, getPatientAppointmentsController);

export default router;