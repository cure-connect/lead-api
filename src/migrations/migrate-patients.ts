/**
 * Migration Script: สร้าง Patient จาก Leads เก่า + ย้าย Deposit เข้า Patient Wallet
 * 
 * วิธีใช้:
 *   npx ts-node scripts/migrate-patients.ts
 *   หรือ
 *   npx tsx scripts/migrate-patients.ts
 * 
 * ⚠️ ควร backup database ก่อนรัน
 * 
 * สิ่งที่ script ทำ:
 *   1. ดึง leads ทั้งหมดที่ยังไม่มี patientId
 *   2. Group by (tel + clinicId) เพื่อระบุ "คนไข้คนเดียวกัน"
 *   3. สร้าง Patient record (ถ้ายังไม่มี)
 *   4. ผูก patientId กลับเข้า leads ทั้งหมดของคนไข้คนนั้น
 *   5. ย้าย deposit จาก leads เข้า Patient wallet (balance + transactions)
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// ============================================
// Models — import จาก project หรือ define inline
// ============================================

// Appointment (Lead) Model
const AppointmentSchema = new mongoose.Schema(
  {
    previousAppointmentId: { type: mongoose.Schema.Types.ObjectId },
    nextAppointmentId: { type: mongoose.Schema.Types.ObjectId },
    patientId: { type: mongoose.Schema.Types.ObjectId, index: true },
    clinic: {
      clinicId: { type: Number, required: true, index: true },
      name: { type: String },
      branch: { type: String },
    },
    patient: {
      patientId: { type: mongoose.Schema.Types.ObjectId },
      fullname: { type: String },
      nickname: { type: String },
      tel: { type: String },
      socialMedia: { type: String },
    },
    appointments: {
      status: { type: String },
      date: { type: Date },
    },
    interests: [{ interestId: String, name: String }],
    payments: { type: mongoose.Schema.Types.Mixed },
    procedures: [{ name: String, price: String, commissionRate: Number, depositUsed: Number }],
    deposit: {
      amount: { type: Number },
      slipUrl: { type: String },
      slipUrls: [{ type: String }],
    },
    receiptUrl: { type: String },
    receiptUrls: [{ type: String }],
    referralChannel: { type: String },
    note: { type: String },
    createdBy: { type: String },
  },
  { timestamps: true, versionKey: false, strict: false }
);

const Appointment = mongoose.model("Appointment", AppointmentSchema);

// Patient Model
interface IPatient {
  clinicId: number;
  fullname: string;
  nickname?: string;
  tel?: string;
  socialMedia?: string;
  balance: number;
  transactions: Array<{
    type: string;
    amount: number;
    description?: string;
    appointmentId?: mongoose.Types.ObjectId;
    createdBy?: string;
    createdAt?: Date;
  }>;
}

const PatientSchema = new mongoose.Schema<IPatient>(
  {
    clinicId: { type: Number, required: true, index: true },
    fullname: { type: String, required: true },
    nickname: { type: String },
    tel: { type: String },
    socialMedia: { type: String },
    balance: { type: Number, default: 0 },
    transactions: [
      {
        type: {
          type: String,
          enum: ["deposit", "use", "refund", "adjust"],
          required: true,
        },
        amount: { type: Number, required: true },
        description: { type: String },
        appointmentId: { type: mongoose.Schema.Types.ObjectId },
        createdBy: { type: String },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true, versionKey: false }
);

PatientSchema.index({ clinicId: 1, tel: 1 });
PatientSchema.index({ clinicId: 1, fullname: 1 });

const Patient = mongoose.model<IPatient>("Patient", PatientSchema);

// ============================================
// Migration Logic
// ============================================

async function migrate() {
  const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

  if (!MONGO_URI) {
    console.error("❌ กรุณาตั้ง MONGODB_URI ใน .env");
    process.exit(1);
  }

  await mongoose.connect(MONGO_URI);
  console.log("✅ Connected to MongoDB");

  // ============================================
  // Step 1: ดึง leads ที่ยังไม่มี patientId
  // ============================================
  const leadsWithoutPatient = await Appointment.find({
    patientId: { $exists: false },
    "patient.fullname": { $exists: true, $ne: "" },
  }).lean();

  console.log(`\n📋 พบ ${leadsWithoutPatient.length} leads ที่ยังไม่มี patientId`);

  if (leadsWithoutPatient.length === 0) {
    console.log("✅ ไม่ต้อง migrate — leads ทั้งหมดมี patientId แล้ว");
    await mongoose.disconnect();
    return;
  }

  // ============================================
  // Step 2: Group leads by (clinicId + tel)
  // ถ้าไม่มี tel → fallback ใช้ fullname
  // ============================================
  interface LeadGroup {
    clinicId: number;
    fullname: string;
    nickname: string;
    tel: string;
    socialMedia: string;
    leads: any[];
  }

  const groupMap = new Map<string, LeadGroup>();

  for (const lead of leadsWithoutPatient) {
    const clinicId = (lead as any).clinic?.clinicId;
    const tel = (lead as any).patient?.tel?.trim() || "";
    const fullname = (lead as any).patient?.fullname?.trim() || "";
    const nickname = (lead as any).patient?.nickname?.trim() || "";
    const socialMedia = (lead as any).patient?.socialMedia?.trim() || "";

    if (!clinicId || !fullname) continue;

    // ใช้ tel เป็น key หลัก, ถ้าไม่มี tel fallback เป็น fullname
    const groupKey = tel
      ? `${clinicId}:tel:${tel}`
      : `${clinicId}:name:${fullname}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        clinicId,
        fullname,
        nickname,
        tel,
        socialMedia,
        leads: [],
      });
    }

    const group = groupMap.get(groupKey)!;
    group.leads.push(lead);

    // ใช้ข้อมูลล่าสุด (lead ที่สร้างทีหลังอาจมีข้อมูลครบกว่า)
    if (fullname && (!group.fullname || fullname.length > group.fullname.length)) {
      group.fullname = fullname;
    }
    if (nickname && !group.nickname) group.nickname = nickname;
    if (socialMedia && !group.socialMedia) group.socialMedia = socialMedia;
  }

  console.log(`👥 Group ได้ ${groupMap.size} คนไข้`);

  // ============================================
  // Step 3: สร้าง Patient + ผูก patientId + ย้าย deposit
  // ============================================
  let patientsCreated = 0;
  let patientsReused = 0;
  let leadsUpdated = 0;
  let depositsImported = 0;

  for (const [key, group] of groupMap) {
    const { clinicId, fullname, nickname, tel, socialMedia, leads } = group;

    // ค้นหา Patient ที่มีอยู่แล้ว (อาจสร้างไว้แล้วจาก leads ใหม่ที่มี code ใหม่)
    let patient = null;

    if (tel) {
      patient = await Patient.findOne({ clinicId, tel });
    }
    if (!patient) {
      patient = await Patient.findOne({ clinicId, fullname });
    }

    if (patient) {
      patientsReused++;
      console.log(`  ♻️ ใช้ Patient ที่มีอยู่: ${fullname} (${tel || "no tel"}) — balance: ${patient.balance}`);
    } else {
      // สร้าง Patient ใหม่
      patient = await Patient.create({
        clinicId,
        fullname,
        nickname: nickname || undefined,
        tel: tel || undefined,
        socialMedia: socialMedia || undefined,
        balance: 0,
        transactions: [],
      });
      patientsCreated++;
      console.log(`  ✨ สร้าง Patient ใหม่: ${fullname} (${tel || "no tel"})`);
    }

    // Sort leads by createdAt เพื่อ process ตามลำดับเวลา
    leads.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    // ============================================
    // ผูก patientId + ย้าย deposit เข้า wallet
    // ============================================
    for (const lead of leads) {
      const leadId = lead._id;

      // Update lead → เพิ่ม patientId
      await Appointment.updateOne(
        { _id: leadId },
        {
          $set: {
            patientId: patient._id,
          },
        }
      );
      leadsUpdated++;

      // ถ้า lead มี deposit → เพิ่มเข้า patient wallet
      const depositAmount = lead.deposit?.amount || 0;
      if (depositAmount > 0) {
        // เช็คว่า deposit นี้ยังไม่เคยถูก import (ป้องกันรันซ้ำ)
        const alreadyImported = patient.transactions.some(
          (t: any) =>
            t.type === "deposit" &&
            t.appointmentId?.toString() === leadId.toString()
        );

        if (!alreadyImported) {
          patient.transactions.push({
            type: "deposit",
            amount: depositAmount,
            description: `[Migration] เงินมัดจำจาก Lead: ${fullname}`,
            appointmentId: leadId,
            createdBy: lead.createdBy || "migration",
            createdAt: lead.createdAt || new Date(),
          });
          patient.balance += depositAmount;
          depositsImported++;
          console.log(`    💰 Import deposit: ${depositAmount} บาท (Lead: ${leadId})`);
        }
      }

      // ถ้า lead status=arrived + มี depositUsed ใน procedures → หักจาก wallet
      if (lead.appointments?.status === "arrived" && Array.isArray(lead.procedures)) {
        const procDepositUsed = (lead.procedures as any[]).reduce(
          (sum: number, p: any) => sum + (Number(p.depositUsed) || 0),
          0
        );

        if (procDepositUsed > 0) {
          const alreadyUsed = patient.transactions.some(
            (t: any) =>
              t.type === "use" &&
              t.appointmentId?.toString() === leadId.toString()
          );

          if (!alreadyUsed) {
            patient.transactions.push({
              type: "use",
              amount: -procDepositUsed,
              description: `[Migration] ใช้มัดจำจาก Lead: ${fullname}`,
              appointmentId: leadId,
              createdBy: lead.createdBy || "migration",
              createdAt: lead.appointments?.date || lead.createdAt || new Date(),
            });
            patient.balance -= procDepositUsed;
            console.log(`    🔻 Import deposit use: -${procDepositUsed} บาท (Lead: ${leadId})`);
          }
        }
      }
    }

    // Save patient with updated transactions
    await patient.save();
  }

  // ============================================
  // Summary
  // ============================================
  console.log("\n" + "=".repeat(60));
  console.log("📊 สรุปผลการ Migration");
  console.log("=".repeat(60));
  console.log(`  ✨ สร้าง Patient ใหม่:    ${patientsCreated} คน`);
  console.log(`  ♻️ ใช้ Patient ที่มีอยู่:   ${patientsReused} คน`);
  console.log(`  🔗 ผูก patientId กับ Lead: ${leadsUpdated} leads`);
  console.log(`  💰 Import Deposit:        ${depositsImported} รายการ`);
  console.log("=".repeat(60));

  // ============================================
  // Verify: ตรวจสอบว่ายังมี leads ที่ไม่มี patientId อีกไหม
  // ============================================
  const remainingLeads = await Appointment.countDocuments({
    patientId: { $exists: false },
    "patient.fullname": { $exists: true, $ne: "" },
  });

  if (remainingLeads > 0) {
    console.log(`\n⚠️ ยังมี ${remainingLeads} leads ที่ไม่ได้ migrate (อาจไม่มี fullname)`);
  } else {
    console.log("\n✅ ทุก leads มี patientId แล้ว!");
  }

  await mongoose.disconnect();
  console.log("\n✅ เสร็จสิ้น — ปิดการเชื่อมต่อ");
}

// ============================================
// Run
// ============================================
migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});