/**
 * Migration Script: แก้ Patient.createdAt ให้ตรงกับ lead แรกสุดของคนไข้
 * 
 * วิธีใช้:
 *   npx tsx scripts/fix-patient-created-at.ts
 * 
 * ⚠️ ควร backup database ก่อนรัน
 * 
 * ปัญหา:
 *   - ตอน migrate-patients.ts สร้าง Patient record ใหม่
 *   - Patient.createdAt กลายเป็นวันที่ migrate ไม่ใช่วันที่คนไข้เข้ามาครั้งแรก
 * 
 * แก้:
 *   - หา lead แรกสุด (createdAt เก่าสุด) ของแต่ละ patient
 *   - อัพเดท Patient.createdAt ให้ตรงกับ lead แรกสุด
 */

/**
 * Migration Script: แก้ Patient.createdAt + เพิ่มข้อมูลจาก lead แรกสุด
 *
 * วิธีใช้:
 *   npx tsx scripts/fix-patient-data.ts
 *
 * ⚠️ ควร backup database ก่อนรัน
 *
 * สิ่งที่ทำ:
 *   1. หา lead แรกสุด (createdAt เก่าสุด) ของแต่ละ patient
 *   2. อัพเดท Patient.createdAt → ตรงกับวันที่เข้ามาครั้งแรก
 *   3. อัพเดท Patient.interest → จาก interests[0].name ของ lead แรก
 *   4. อัพเดท Patient.referralChannel → จาก referralChannel ของ lead แรก
 *   5. อัพเดท Patient.createdBy → จาก createdBy ของ lead แรก
 *   6. อัพเดท Patient.branch → จาก clinic.branch ของ lead แรก
 */

// import mongoose from "mongoose";
// import dotenv from "dotenv";
// dotenv.config();

// // Appointment Model
// const AppointmentSchema = new mongoose.Schema(
//     {
//         patientId: { type: mongoose.Schema.Types.ObjectId, index: true },
//         clinic: { clinicId: Number, name: String, branch: String },
//         patient: { fullname: String, nickname: String, tel: String },
//         appointments: { status: String, date: Date },
//         interests: [{ name: String }],
//         referralChannel: String,
//         createdBy: String,
//     },
//     { timestamps: true, versionKey: false, strict: false }
// );
// const Appointment = mongoose.model("Appointment", AppointmentSchema);

// // Patient Model
// const PatientSchema = new mongoose.Schema(
//     {
//         clinicId: Number,
//         fullname: String,
//         interest: String,
//         referralChannel: String,
//         createdBy: String,
//         branch: String,
//     },
//     { timestamps: true, versionKey: false, strict: false }
// );
// const Patient = mongoose.model("Patient", PatientSchema);

// async function migrate() {
//     const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

//     if (!MONGO_URI) {
//         console.error("❌ กรุณาตั้ง MONGODB_URI ใน .env");
//         process.exit(1);
//     }

//     await mongoose.connect(MONGO_URI);
//     console.log("✅ Connected to MongoDB");

//     // ============================================
//     // Step 1: หา lead แรกสุดของแต่ละ patient พร้อมข้อมูลครบ
//     // ============================================
//     const earliestLeads = await Appointment.aggregate([
//         {
//             $match: {
//                 patientId: { $exists: true, $ne: null },
//             },
//         },
//         {
//             $sort: { createdAt: 1 },
//         },
//         {
//             $group: {
//                 _id: "$patientId",
//                 earliestCreatedAt: { $first: "$createdAt" },
//                 patientName: { $first: "$patient.fullname" },
//                 interest: { $first: { $arrayElemAt: ["$interests.name", 0] } },
//                 referralChannel: { $first: "$referralChannel" },
//                 createdBy: { $first: "$createdBy" },
//                 branch: { $first: "$clinic.branch" },
//             },
//         },
//     ]);

//     console.log(`\n📋 พบ ${earliestLeads.length} patients ที่มี leads`);

//     if (earliestLeads.length === 0) {
//         console.log("✅ ไม่มีข้อมูลต้องแก้");
//         await mongoose.disconnect();
//         return;
//     }

//     // ============================================
//     // Step 2: อัพเดท Patient
//     // ============================================
//     let updatedDate = 0;
//     let updatedFields = 0;
//     let skipped = 0;

//     for (const item of earliestLeads) {
//         const patientId = item._id;
//         const patient = await Patient.findById(patientId);
//         if (!patient) {
//             skipped++;
//             continue;
//         }

//         const updates: Record<string, any> = {};
//         const changes: string[] = [];

//         // แก้ createdAt
//         if (item.earliestCreatedAt) {
//             const earliestTime = new Date(item.earliestCreatedAt).getTime();
//             const currentTime = new Date((patient as any).createdAt).getTime();
//             if (earliestTime < currentTime) {
//                 updates.createdAt = item.earliestCreatedAt;
//                 changes.push("createdAt");
//                 updatedDate++;
//             }
//         }

//         // เพิ่ม interest (ถ้ายังไม่มี)
//         if (item.interest && !(patient as any).interest) {
//             updates.interest = item.interest;
//             changes.push("interest");
//         }

//         // เพิ่ม referralChannel (ถ้ายังไม่มี)
//         if (item.referralChannel && !(patient as any).referralChannel) {
//             updates.referralChannel = item.referralChannel;
//             changes.push("referralChannel");
//         }

//         // เพิ่ม createdBy (ถ้ายังไม่มี)
//         if (item.createdBy && !(patient as any).createdBy) {
//             updates.createdBy = item.createdBy;
//             changes.push("createdBy");
//         }

//         // เพิ่ม branch (ถ้ายังไม่มี)
//         if (item.branch && !(patient as any).branch) {
//             updates.branch = item.branch;
//             changes.push("branch");
//         }

//         if (Object.keys(updates).length > 0) {
//             await Patient.updateOne({ _id: patientId }, { $set: updates });
//             updatedFields++;
//             console.log(
//                 `  ✨ ${String(item.patientName || "").padEnd(25)} [${changes.join(", ")}]`
//             );
//         } else {
//             skipped++;
//         }
//     }

//     // ============================================
//     // Summary
//     // ============================================
//     console.log("\n" + "=".repeat(55));
//     console.log("📊 สรุปผล");
//     console.log("=".repeat(55));
//     console.log(`  📅 แก้ createdAt:      ${updatedDate} คน`);
//     console.log(`  ✨ เพิ่มข้อมูล:        ${updatedFields} คน`);
//     console.log(`  ⏭️  ข้าม (ไม่ต้องแก้):  ${skipped} คน`);
//     console.log("=".repeat(55));

//     await mongoose.disconnect();
//     console.log("\n✅ เสร็จสิ้น");
// }

// migrate().catch((err) => {
//     console.error("❌ Migration failed:", err);
//     process.exit(1);
// });

/**
 * Migration Script: แก้ Patient.createdAt + เพิ่มข้อมูลจาก lead แรกสุด
 *
 * วิธีใช้:
 *   npx tsx scripts/fix-patient-data.ts
 *
 * ⚠️ ควร backup database ก่อนรัน
 *
 * สิ่งที่ทำ:
 *   1. หา lead แรกสุด (createdAt เก่าสุด) ของแต่ละ patient
 *   2. อัพเดท Patient.createdAt → ตรงกับวันที่เข้ามาครั้งแรก
 *   3. อัพเดท Patient.interest → จาก interests[0].name ของ lead แรก
 *   4. อัพเดท Patient.referralChannel → จาก referralChannel ของ lead แรก
 *   5. อัพเดท Patient.createdBy → จาก createdBy ของ lead แรก
 *   6. อัพเดท Patient.branch → จาก clinic.branch ของ lead แรก
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

// Appointment Model
const AppointmentSchema = new mongoose.Schema(
    {
        patientId: { type: mongoose.Schema.Types.ObjectId, index: true },
        clinic: { clinicId: Number, name: String, branch: String },
        patient: { fullname: String, nickname: String, tel: String },
        appointments: { status: String, date: Date },
        interests: [{ name: String }],
        referralChannel: String,
        createdBy: String,
    },
    { timestamps: true, versionKey: false, strict: false }
);
const Appointment = mongoose.model("Appointment", AppointmentSchema);

// Patient Model
const PatientSchema = new mongoose.Schema(
    {
        clinicId: Number,
        fullname: String,
        interest: String,
        referralChannel: String,
        createdBy: String,
        branch: String,
    },
    { timestamps: true, versionKey: false, strict: false }
);
const Patient = mongoose.model("Patient", PatientSchema);

async function migrate() {
    const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "";

    if (!MONGO_URI) {
        console.error("❌ กรุณาตั้ง MONGODB_URI ใน .env");
        process.exit(1);
    }

    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // ============================================
    // Step 1: หา lead แรกสุดของแต่ละ patient พร้อมข้อมูลครบ
    // ============================================
    const earliestLeads = await Appointment.aggregate([
        {
            $match: {
                patientId: { $exists: true, $ne: null },
            },
        },
        {
            $sort: { createdAt: 1 },
        },
        {
            $group: {
                _id: "$patientId",
                earliestCreatedAt: { $first: "$createdAt" },
                patientName: { $first: "$patient.fullname" },
                interest: { $first: { $arrayElemAt: ["$interests.name", 0] } },
                referralChannel: { $first: "$referralChannel" },
                createdBy: { $first: "$createdBy" },
                branch: { $first: "$clinic.branch" },
            },
        },
    ]);

    console.log(`\n📋 พบ ${earliestLeads.length} patients ที่มี leads`);

    // Debug: แสดงข้อมูล 3 คนแรก
    earliestLeads.slice(0, 3).forEach((item) => {
        console.log(`  🔍 ${item.patientName}: earliestCreatedAt = ${item.earliestCreatedAt}`);
    });

    if (earliestLeads.length === 0) {
        console.log("✅ ไม่มีข้อมูลต้องแก้");
        await mongoose.disconnect();
        return;
    }

    // ============================================
    // Step 2: อัพเดท Patient
    // ============================================
    let updatedDate = 0;
    let updatedFields = 0;
    let skipped = 0;

    for (const item of earliestLeads) {
        const patientId = item._id;
        const patient = await Patient.findById(patientId);
        if (!patient) {
            skipped++;
            continue;
        }

        const updates: Record<string, any> = {};
        const changes: string[] = [];

        // แก้ createdAt
        if (item.earliestCreatedAt) {
            const earliestTime = new Date(item.earliestCreatedAt).getTime();
            const currentTime = new Date((patient as any).createdAt).getTime();
            if (earliestTime < currentTime) {
                updates.createdAt = item.earliestCreatedAt;
                changes.push("createdAt");
                updatedDate++;
            }
        }

        // เพิ่ม interest (ถ้ายังไม่มี)
        if (item.interest && !(patient as any).interest) {
            updates.interest = item.interest;
            changes.push("interest");
        }

        // เพิ่ม referralChannel (ถ้ายังไม่มี)
        if (item.referralChannel && !(patient as any).referralChannel) {
            updates.referralChannel = item.referralChannel;
            changes.push("referralChannel");
        }

        // เพิ่ม createdBy (ถ้ายังไม่มี)
        if (item.createdBy && !(patient as any).createdBy) {
            updates.createdBy = item.createdBy;
            changes.push("createdBy");
        }

        // เพิ่ม branch (ถ้ายังไม่มี)
        if (item.branch && !(patient as any).branch) {
            updates.branch = item.branch;
            changes.push("branch");
        }

        if (Object.keys(updates).length > 0) {
            // ใช้ raw MongoDB driver เพื่อ bypass Mongoose timestamps
            // (Mongoose timestamps: true จะป้องกันการ overwrite createdAt)
            await Patient.collection.updateOne(
                { _id: patientId },
                { $set: updates }
            );
            updatedFields++;
            console.log(
                `  ✨ ${String(item.patientName || "").padEnd(25)} [${changes.join(", ")}]`
            );
        } else {
            skipped++;
        }
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n" + "=".repeat(55));
    console.log("📊 สรุปผล");
    console.log("=".repeat(55));
    console.log(`  📅 แก้ createdAt:      ${updatedDate} คน`);
    console.log(`  ✨ เพิ่มข้อมูล:        ${updatedFields} คน`);
    console.log(`  ⏭️  ข้าม (ไม่ต้องแก้):  ${skipped} คน`);
    console.log("=".repeat(55));

    // ============================================
    // Verify: เช็คผลลัพธ์
    // ============================================
    console.log("\n🔍 ตรวจสอบผลลัพธ์...");
    for (const item of earliestLeads.slice(0, 3)) {
        const p = await Patient.collection.findOne({ _id: item._id });
        if (p) {
            console.log(`  ${String(item.patientName || "").padEnd(20)} Patient.createdAt = ${(p as any).createdAt}  (ควรเป็น ${item.earliestCreatedAt})`);
        }
    }

    await mongoose.disconnect();
    console.log("\n✅ เสร็จสิ้น");
}

migrate().catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
});