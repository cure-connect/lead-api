import { Router } from "express";
import {
    getClinics,
    getClinicOptions,
    getAllOptions,
    getFormSchema,
} from "../controllers/option.controller";

const router = Router();

/**
 * Option Routes (External API)
 * Base: /api/external/v1/options
 * 
 * Permission: read:options
 * 
 * Use Cases:
 * 1. เพิ่ม leads ได้ทุก clinic:
 *    - GET /clinics → เลือก clinic
 *    - GET /clinics/:clinicId → ดึง settings
 *    - POST /leads → สร้าง lead
 * 
 * 2. เพิ่ม leads เฉพาะ clinic:
 *    - GET /clinics/:clinicId → ดึง settings
 *    - POST /leads → สร้าง lead
 * 
 * 3. Cache ข้อมูลทั้งหมด:
 *    - GET /all → ดึงทุกอย่างครั้งเดียว
 */

// GET /form-schema - Schema สำหรับสร้าง dynamic form
router.get("/form-schema", getFormSchema);

// GET /all - ดึงข้อมูลทั้งหมด (สำหรับ cache)
router.get("/all", getAllOptions);

// GET /clinics - รายการ clinics
router.get("/clinics", getClinics);

// GET /clinics/:clinicId - Settings ของ clinic
router.get("/clinics/:clinicId", getClinicOptions);

export default router;