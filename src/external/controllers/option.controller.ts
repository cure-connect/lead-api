import { Request, Response } from "express";
import { UserModel } from "../../models/user";
import { SettingModel } from "../../models/setting";
import logger from "../../services/logger.service";

/**
 * Option Controller for External API
 * ให้ระบบอื่นดึงข้อมูลสำหรับสร้าง Lead Form
 * 
 * Use Cases:
 * 1. เพิ่ม leads ได้ทุก clinic → เรียก /clinics ก่อน แล้วค่อยเรียก /clinics/:clinicId
 * 2. เพิ่ม leads เฉพาะ clinic → เรียก /clinics/:clinicId เลย
 */

/**
 * GET /clinics
 * ดึงรายการ clinics ทั้งหมด (สำหรับ dropdown เลือก clinic)
 */
export const getClinics = async (req: Request, res: Response) => {
  try {
    const { active_only } = req.query;

    const query: any = {};
    
    // ถ้าต้องการเฉพาะ clinic ที่ยังไม่หมดอายุ
    if (active_only === "true") {
      query.$or = [
        { expired: { $exists: false } },
        { expired: null },
        { expired: { $gte: new Date() } },
      ];
    }

    const clinics = await UserModel.find(query)
      .select("clinicId clinicName branch username expired")
      .sort({ clinicId: 1 })
      .lean();

    // Format สำหรับ dropdown
    const options = clinics.map((c: any) => ({
      value: c.clinicId,
      label: c.clinicName + (c.branch ? ` - ${c.branch}` : ""),
      clinicId: c.clinicId,
      clinicName: c.clinicName,
      branch: c.branch,
      expired: c.expired,
      isExpired: c.expired ? new Date(c.expired) < new Date() : false,
    }));

    res.json({
      success: true,
      data: options,
      count: options.length,
    });
  } catch (error: any) {
    logger.error("External API: Failed to get clinics", { error: error.message });
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve clinics" },
    });
  }
};

/**
 * GET /clinics/:clinicId
 * ดึง settings ทั้งหมดของ clinic (สำหรับ dropdown ต่างๆ ในฟอร์ม)
 */
export const getClinicOptions = async (req: Request, res: Response) => {
  try {
    const { clinicId } = req.params;
    const clinicIdNum = parseInt(clinicId);

    // ดึงข้อมูล clinic พร้อม features
    const clinic = await UserModel.findOne({ clinicId: clinicIdNum })
      .select("clinicId clinicName branch features")
      .lean();

    if (!clinic) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Clinic not found" },
      });
    }

    // ดึง settings
    const settings = await SettingModel.find({ clinicId: clinicIdNum })
      .select("_id type name")
      .sort({ type: 1, name: 1 })
      .lean();

    // จัดกลุ่มตาม type
    const grouped: Record<string, any[]> = {
      admin: [],
      branch: [],
      channel: [],
      interest: [],
      procedure: [],
    };

    settings.forEach((s: any) => {
      if (grouped[s.type]) {
        grouped[s.type].push({
          value: s._id.toString(),
          label: s.name,
          id: s._id.toString(),
          name: s.name,
        });
      }
    });

    // Appointment status options
    const statusOptions = [
      { value: "pending", label: "รอดำเนินการ" },
      { value: "scheduled", label: "นัดหมายแล้ว" },
      { value: "rescheduled", label: "เลื่อนนัด" },
      { value: "cancelled", label: "ยกเลิก" },
      { value: "arrived", label: "มาถึงแล้ว" },
    ];

    // Procedure config จาก user.features
    const procedureConfig = (clinic as any).features?.procedure || {
      enabled: false,
      allowCustom: true,
    };

    res.json({
      success: true,
      data: {
        clinic: {
          clinicId: (clinic as any).clinicId,
          clinicName: (clinic as any).clinicName,
          branch: (clinic as any).branch,
        },
        options: {
          admins: grouped.admin,
          branches: grouped.branch,
          channels: grouped.channel,
          interests: grouped.interest,
          procedures: procedureConfig.enabled ? grouped.procedure : [],
          statuses: statusOptions,
        },
        config: {
          procedure: procedureConfig,
        },
      },
    });
  } catch (error: any) {
    logger.error("External API: Failed to get clinic options", { error: error.message });
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve clinic options" },
    });
  }
};

/**
 * GET /all
 * ดึงข้อมูลทั้งหมด (clinics + settings ของทุก clinic)
 * ⚠️ ใช้สำหรับ cache ฝั่ง client - ข้อมูลอาจมาก
 */
export const getAllOptions = async (req: Request, res: Response) => {
  try {
    const { active_only } = req.query;

    // Query สำหรับ clinics
    const clinicQuery: any = {};
    if (active_only === "true") {
      clinicQuery.$or = [
        { expired: { $exists: false } },
        { expired: null },
        { expired: { $gte: new Date() } },
      ];
    }

    // ดึง clinics พร้อม features
    const clinics = await UserModel.find(clinicQuery)
      .select("clinicId clinicName branch expired features")
      .sort({ clinicId: 1 })
      .lean();

    // ดึง settings ทั้งหมด
    const clinicIds = clinics.map((c: any) => c.clinicId);
    const settings = await SettingModel.find({ clinicId: { $in: clinicIds } })
      .select("_id clinicId type name")
      .sort({ clinicId: 1, type: 1, name: 1 })
      .lean();

    // จัดกลุ่ม settings ตาม clinicId
    const settingsByClinic: Record<number, Record<string, any[]>> = {};
    
    settings.forEach((s: any) => {
      if (!settingsByClinic[s.clinicId]) {
        settingsByClinic[s.clinicId] = {
          admin: [],
          branch: [],
          channel: [],
          interest: [],
          procedure: [],
        };
      }
      
      if (settingsByClinic[s.clinicId][s.type]) {
        settingsByClinic[s.clinicId][s.type].push({
          value: s._id.toString(),
          label: s.name,
          id: s._id.toString(),
          name: s.name,
        });
      }
    });

    // Format response
    const data = clinics.map((c: any) => {
      const procedureConfig = c.features?.procedure || {
        enabled: false,
        allowCustom: true,
      };

      const clinicSettings = settingsByClinic[c.clinicId] || {
        admin: [],
        branch: [],
        channel: [],
        interest: [],
        procedure: [],
      };

      return {
        clinic: {
          value: c.clinicId,
          label: c.clinicName + (c.branch ? ` - ${c.branch}` : ""),
          clinicId: c.clinicId,
          clinicName: c.clinicName,
          branch: c.branch,
          expired: c.expired,
          isExpired: c.expired ? new Date(c.expired) < new Date() : false,
        },
        options: {
          ...clinicSettings,
          procedures: procedureConfig.enabled ? clinicSettings.procedure : [],
        },
        config: {
          procedure: procedureConfig,
        },
      };
    });

    // Status options (ใช้ร่วมกันทุก clinic)
    const statusOptions = [
      { value: "pending", label: "รอดำเนินการ" },
      { value: "scheduled", label: "นัดหมายแล้ว" },
      { value: "rescheduled", label: "เลื่อนนัด" },
      { value: "cancelled", label: "ยกเลิก" },
      { value: "arrived", label: "มาถึงแล้ว" },
    ];

    res.json({
      success: true,
      data: {
        clinics: data,
        statuses: statusOptions,
      },
      count: data.length,
    });
  } catch (error: any) {
    logger.error("External API: Failed to get all options", { error: error.message });
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve options" },
    });
  }
};

/**
 * GET /form-schema
 * ดึง schema ของฟอร์ม Lead (สำหรับ dynamic form generation)
 */
export const getFormSchema = async (req: Request, res: Response) => {
  try {
    const schema = {
      fields: [
        {
          name: "clinic",
          type: "select",
          label: "คลินิก",
          required: true,
          optionsEndpoint: "/options/clinics",
        },
        {
          name: "patient.fullname",
          type: "text",
          label: "ชื่อ-นามสกุล",
          required: true,
        },
        {
          name: "patient.nickname",
          type: "text",
          label: "ชื่อเล่น",
          required: false,
        },
        {
          name: "patient.tel",
          type: "tel",
          label: "เบอร์โทร",
          required: false,
        },
        {
          name: "patient.socialMedia",
          type: "text",
          label: "Social Media",
          required: false,
        },
        {
          name: "appointments.status",
          type: "select",
          label: "สถานะ",
          required: true,
          options: [
            { value: "pending", label: "รอดำเนินการ" },
            { value: "scheduled", label: "นัดหมายแล้ว" },
            { value: "rescheduled", label: "เลื่อนนัด" },
            { value: "cancelled", label: "ยกเลิก" },
            { value: "arrived", label: "มาถึงแล้ว" },
          ],
          default: "pending",
        },
        {
          name: "appointments.date",
          type: "datetime",
          label: "วันที่นัด",
          required: false,
          showWhen: { field: "appointments.status", value: "scheduled" },
        },
        {
          name: "interests",
          type: "multiselect",
          label: "ความสนใจ",
          required: false,
          optionsFrom: "clinic.options.interests",
        },
        {
          name: "procedure",
          type: "combobox",
          label: "ขั้นตอนการรักษา",
          required: false,
          optionsFrom: "clinic.options.procedures",
          allowCustom: "clinic.config.procedure.allowCustom",
          showWhen: { field: "clinic.config.procedure.enabled", value: true },
        },
        {
          name: "referralChannel",
          type: "select",
          label: "ช่องทางที่รู้จัก",
          required: false,
          optionsFrom: "clinic.options.channels",
        },
        {
          name: "note",
          type: "textarea",
          label: "หมายเหตุ",
          required: false,
        },
        {
          name: "createdBy",
          type: "text",
          label: "ผู้บันทึก",
          required: true,
        },
      ],
      submitEndpoint: "/leads",
      submitMethod: "POST",
    };

    res.json({
      success: true,
      data: schema,
    });
  } catch (error: any) {
    logger.error("External API: Failed to get form schema", { error: error.message });
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Failed to retrieve form schema" },
    });
  }
};